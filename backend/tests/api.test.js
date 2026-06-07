/**
 * ============================================================
 * E-Book Store API — Comprehensive Jest Test Suite
 * ============================================================
 *
 * Cakupan pengujian:
 *   1. Auth endpoints   (register, login, me)
 *   2. Books endpoints  (public read + admin CRUD)
 *   3. Purchases        (checkout, my-books)
 *   4. Borrows          (pinjam, my-borrows)
 *   5. Status           (/api/status)
 *   6. Chat             (/api/chat)
 *
 * Catatan teknis:
 *   - process.env HARUS di-set SEBELUM require() agar JWT_SECRET
 *     terbaca konsisten antara middleware/auth.js dan server.js.
 *   - Data JSON di-backup sebelum test dan di-restore sesudahnya
 *     agar tidak mencemari data produksi.
 */

// ──────────────────────────────────────────────
// 0. Environment variables — HARUS PALING ATAS
// ──────────────────────────────────────────────
process.env.JWT_SECRET = 'test_secret_key';
process.env.GEMINI_API_KEY = '';        // Nonaktifkan AI saat testing
process.env.NODE_ENV = 'test';
process.env.PORT = '5111';              // Port unik agar tidak bentrok

// ──────────────────────────────────────────────
// 1. Dependencies
// ──────────────────────────────────────────────
const request = require('supertest');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// ──────────────────────────────────────────────
// 2. Paths & Constants
// ──────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '..', 'data');
const BOOKS_FILE = path.join(DATA_DIR, 'books.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
const BORROWS_FILE = path.join(DATA_DIR, 'borrows.json');

const JWT_SECRET = 'test_secret_key';

// ──────────────────────────────────────────────
// 3. Token helpers
// ──────────────────────────────────────────────
const adminToken = jwt.sign(
  { id: 'u1', username: 'admin', role: 'admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const userToken = jwt.sign(
  { id: 'u2', username: 'testuser', role: 'user' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

const invalidToken = 'this.is.not.a.valid.jwt.token';

// ──────────────────────────────────────────────
// 4. Seed data (isolated from production)
// ──────────────────────────────────────────────
const salt = bcrypt.genSaltSync(10);

const seedBooks = [
  {
    id: 'test-book-1',
    title: 'Test Book One',
    author: 'Author A',
    genre: 'Fiction',
    price: 50000,
    originalPrice: 60000,
    stock: 10,
    description: 'First test book',
    imageUrl: 'img/test1.jpg',
  },
  {
    id: 'test-book-2',
    title: 'Test Book Two',
    author: 'Author B',
    genre: 'Science',
    price: 75000,
    originalPrice: 85000,
    stock: 5,
    description: 'Second test book',
    imageUrl: 'img/test2.jpg',
  },
  {
    id: 'test-book-3',
    title: 'Out of Stock',
    author: 'Author C',
    genre: 'History',
    price: 40000,
    originalPrice: 50000,
    stock: 0,
    description: 'This book has no stock',
    imageUrl: 'img/test3.jpg',
  },
];

const seedUsers = [
  {
    id: 'u1',
    username: 'admin',
    password: bcrypt.hashSync('admin123', salt),
    role: 'admin',
  },
  {
    id: 'u2',
    username: 'testuser',
    password: bcrypt.hashSync('user123', salt),
    role: 'user',
  },
];

// ──────────────────────────────────────────────
// 5. Backup / Restore helpers
// ──────────────────────────────────────────────
const backups = {};

function backupFile(filePath) {
  if (fs.existsSync(filePath)) {
    backups[filePath] = fs.readFileSync(filePath, 'utf-8');
  } else {
    backups[filePath] = null;
  }
}

function restoreFile(filePath) {
  if (backups[filePath] !== undefined) {
    if (backups[filePath] === null) {
      // File didn't exist before — remove if created during tests
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else {
      fs.writeFileSync(filePath, backups[filePath], 'utf-8');
    }
  }
}

function writeSeedData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(BOOKS_FILE, JSON.stringify(seedBooks, null, 2), 'utf-8');
  fs.writeFileSync(USERS_FILE, JSON.stringify(seedUsers, null, 2), 'utf-8');
  fs.writeFileSync(PURCHASES_FILE, JSON.stringify([], null, 2), 'utf-8');
  fs.writeFileSync(BORROWS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// ──────────────────────────────────────────────
// 6. App bootstrap
// ──────────────────────────────────────────────
let app;

beforeAll(() => {
  // Backup semua data file produksi
  [BOOKS_FILE, USERS_FILE, PURCHASES_FILE, BORROWS_FILE].forEach(backupFile);

  // Tulis seed data test
  writeSeedData();

  // Clear require cache supaya server.js terbaca ulang dengan env test
  delete require.cache[require.resolve('../server')];
  delete require.cache[require.resolve('../database')];
  delete require.cache[require.resolve('../middleware/auth')];

  app = require('../server');
});

afterAll((done) => {
  // Restore data file produksi
  [BOOKS_FILE, USERS_FILE, PURCHASES_FILE, BORROWS_FILE].forEach(restoreFile);

  // Tutup server untuk menghindari open handles
  if (app && app.server) {
    app.server.close(done);
  } else {
    done();
  }
});

// ============================================================
// RESET data sebelum setiap describe-block agar test terisolasi
// ============================================================
function resetData() {
  writeSeedData();
  // Also clear the require cache for database so it re-reads the files
}

// ============================================================
//  T E S T   S U I T E S
// ============================================================

// ──────────────────────────────────────────────
// 1. AUTH ENDPOINTS
// ──────────────────────────────────────────────
describe('Auth Endpoints (/api/auth)', () => {

  // ── REGISTER ────────────────────────────────
  describe('POST /api/auth/register', () => {
    beforeEach(() => resetData());

    it('harus berhasil register dengan data valid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser', password: 'newpass123' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('username', 'newuser');
      expect(res.body.user).toHaveProperty('role', 'user');
      // Password tidak boleh dikembalikan
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('harus mengembalikan 400 jika username kosong', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: 'somepass' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('harus mengembalikan 400 jika password kosong', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'onlyuser' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('harus mengembalikan 400 jika username & password keduanya kosong', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('harus mengembalikan 400 jika username sudah digunakan', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'admin', password: 'whatever123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/sudah/i);
    });

    it('harus mengembalikan 400 jika username duplikat (case-insensitive)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'Admin', password: 'whatever123' });

      expect(res.status).toBe(400);
    });

    it('user baru harus mendapat role "user" secara default', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'defaultroleuser', password: 'pass123' });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('user');
    });
  });

  // ── LOGIN ───────────────────────────────────
  describe('POST /api/auth/login', () => {
    beforeEach(() => resetData());

    it('harus berhasil login dengan kredensial valid', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toMatch(/berhasil/i);
    });

    it('harus mengembalikan JWT token saat login berhasil', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.split('.')).toHaveLength(3); // JWT format
    });

    it('harus mengembalikan user object tanpa password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('username', 'admin');
      expect(res.body.user).toHaveProperty('role', 'admin');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('harus mengembalikan 400 jika username kosong', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'admin123' });

      expect(res.status).toBe(400);
    });

    it('harus mengembalikan 400 jika password kosong', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' });

      expect(res.status).toBe(400);
    });

    it('harus mengembalikan 400 jika username tidak ditemukan', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'whatever' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/salah/i);
    });

    it('harus mengembalikan 400 jika password salah', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/salah/i);
    });

    it('harus bisa login sebagai user biasa', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'user123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('user');
    });
  });

  // ── ME (verifikasi sesi) ────────────────────
  describe('GET /api/auth/me', () => {
    it('harus mengembalikan info user dengan token valid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('username', 'admin');
      expect(res.body.user).toHaveProperty('role', 'admin');
    });

    it('harus mengembalikan 401 tanpa token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
    });

    it('harus mengembalikan 403 dengan token tidak valid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('message');
    });

    it('harus mengembalikan 403 dengan token yang ditandatangani secret berbeda', async () => {
      const badSecretToken = jwt.sign(
        { id: 'u1', username: 'admin', role: 'admin' },
        'wrong_secret',
        { expiresIn: '1h' }
      );
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${badSecretToken}`);

      expect(res.status).toBe(403);
    });

    it('harus mengembalikan 401 jika header Authorization format salah (tanpa Bearer)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', adminToken); // tanpa "Bearer "

      expect(res.status).toBe(401);
    });
  });
});

// ──────────────────────────────────────────────
// 2. BOOKS ENDPOINTS
// ──────────────────────────────────────────────
describe('Books Endpoints (/api/books)', () => {

  // ── PUBLIC READ ─────────────────────────────
  describe('GET /api/books (Public)', () => {
    beforeEach(() => resetData());

    it('harus mengembalikan status 200', async () => {
      const res = await request(app).get('/api/books');
      expect(res.status).toBe(200);
    });

    it('harus mengembalikan array of books', async () => {
      const res = await request(app).get('/api/books');
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3); // 3 seed books
    });

    it('setiap buku harus memiliki field yang diperlukan', async () => {
      const res = await request(app).get('/api/books');
      const book = res.body[0];

      expect(book).toHaveProperty('id');
      expect(book).toHaveProperty('title');
      expect(book).toHaveProperty('author');
      expect(book).toHaveProperty('genre');
      expect(book).toHaveProperty('price');
      expect(book).toHaveProperty('stock');
    });

    it('harus bisa diakses tanpa token (public)', async () => {
      const res = await request(app).get('/api/books');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/books/:id (Public)', () => {
    beforeEach(() => resetData());

    it('harus mengembalikan buku yang sesuai ID', async () => {
      const res = await request(app).get('/api/books/test-book-1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'test-book-1');
      expect(res.body).toHaveProperty('title', 'Test Book One');
    });

    it('harus mengembalikan 404 untuk buku yang tidak ada', async () => {
      const res = await request(app).get('/api/books/nonexistent-id');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message');
    });

    it('harus mengembalikan detail lengkap buku', async () => {
      const res = await request(app).get('/api/books/test-book-2');

      expect(res.body).toHaveProperty('title', 'Test Book Two');
      expect(res.body).toHaveProperty('author', 'Author B');
      expect(res.body).toHaveProperty('genre', 'Science');
      expect(res.body).toHaveProperty('price', 75000);
      expect(res.body).toHaveProperty('stock', 5);
      expect(res.body).toHaveProperty('description');
    });
  });

  // ── ADMIN CRUD ──────────────────────────────
  describe('POST /api/books (Admin — Tambah Buku)', () => {
    beforeEach(() => resetData());

    const validBook = {
      title: 'New Book',
      author: 'New Author',
      genre: 'Tech',
      price: 90000,
      stock: 20,
      description: 'A brand-new book',
    };

    it('admin bisa menambahkan buku baru', async () => {
      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validBook);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('book');
      expect(res.body.book).toHaveProperty('title', 'New Book');
      expect(res.body.book).toHaveProperty('id');
    });

    it('harus mengembalikan 400 jika field wajib tidak lengkap (title kosong)', async () => {
      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ author: 'Author', genre: 'Tech', price: 10000, stock: 1 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('harus mengembalikan 400 jika price tidak ada', async () => {
      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'No Price', author: 'Author', genre: 'Tech', stock: 1 });

      expect(res.status).toBe(400);
    });

    it('harus mengembalikan 401 tanpa token', async () => {
      const res = await request(app)
        .post('/api/books')
        .send(validBook);

      expect(res.status).toBe(401);
    });

    it('harus mengembalikan 403 dengan token user biasa (bukan admin)', async () => {
      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${userToken}`)
        .send(validBook);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/admin/i);
    });

    it('buku baru harus muncul di daftar GET /api/books', async () => {
      await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validBook);

      const res = await request(app).get('/api/books');
      const found = res.body.find(b => b.title === 'New Book');
      expect(found).toBeDefined();
    });
  });

  describe('PUT /api/books/:id (Admin — Edit Buku)', () => {
    beforeEach(() => resetData());

    it('admin bisa mengupdate buku', async () => {
      const res = await request(app)
        .put('/api/books/test-book-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated Title', price: 55000 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('book');
      expect(res.body.book.title).toBe('Updated Title');
      expect(res.body.book.price).toBe(55000);
    });

    it('harus mengembalikan 404 untuk ID buku yang tidak ada', async () => {
      const res = await request(app)
        .put('/api/books/fake-id-999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Ghost Book' });

      expect(res.status).toBe(404);
    });

    it('harus mengembalikan 403 dengan token user biasa', async () => {
      const res = await request(app)
        .put('/api/books/test-book-1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Hacker Edit' });

      expect(res.status).toBe(403);
    });

    it('field yang tidak diupdate harus tetap utuh', async () => {
      const res = await request(app)
        .put('/api/books/test-book-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Only Title Changed' });

      expect(res.body.book.title).toBe('Only Title Changed');
      expect(res.body.book.author).toBe('Author A');     // unchanged
      expect(res.body.book.genre).toBe('Fiction');        // unchanged
      expect(res.body.book.price).toBe(50000);            // unchanged
    });
  });

  describe('DELETE /api/books/:id (Admin — Hapus Buku)', () => {
    beforeEach(() => resetData());

    it('admin bisa menghapus buku', async () => {
      const res = await request(app)
        .delete('/api/books/test-book-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/berhasil/i);
    });

    it('buku yang dihapus tidak lagi muncul di GET /api/books', async () => {
      await request(app)
        .delete('/api/books/test-book-1')
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app).get('/api/books');
      const found = res.body.find(b => b.id === 'test-book-1');
      expect(found).toBeUndefined();
    });

    it('harus mengembalikan 404 untuk ID buku yang tidak ada', async () => {
      const res = await request(app)
        .delete('/api/books/fake-id-999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('harus mengembalikan 403 dengan token user biasa', async () => {
      const res = await request(app)
        .delete('/api/books/test-book-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('harus mengembalikan 401 tanpa token', async () => {
      const res = await request(app)
        .delete('/api/books/test-book-1');

      expect(res.status).toBe(401);
    });
  });
});

// ──────────────────────────────────────────────
// 3. PURCHASES / CHECKOUT ENDPOINTS
// ──────────────────────────────────────────────
describe('Purchases Endpoints (/api/purchases)', () => {

  describe('POST /api/purchases/checkout', () => {
    beforeEach(() => resetData());

    it('harus berhasil checkout dengan bookIds valid', async () => {
      const res = await request(app)
        .post('/api/purchases/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookIds: ['test-book-1'] });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('purchases');
      expect(Array.isArray(res.body.purchases)).toBe(true);
      expect(res.body.purchases).toHaveLength(1);
    });

    it('harus bisa checkout beberapa buku sekaligus', async () => {
      const res = await request(app)
        .post('/api/purchases/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookIds: ['test-book-1', 'test-book-2'] });

      expect(res.status).toBe(201);
      expect(res.body.purchases).toHaveLength(2);
    });

    it('stok buku harus berkurang setelah checkout', async () => {
      await request(app)
        .post('/api/purchases/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookIds: ['test-book-1'] });

      const res = await request(app).get('/api/books/test-book-1');
      expect(res.body.stock).toBe(9); // dari 10 jadi 9
    });

    it('harus mengembalikan 400 dengan bookIds array kosong', async () => {
      const res = await request(app)
        .post('/api/purchases/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookIds: [] });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('harus mengembalikan 400 tanpa field bookIds', async () => {
      const res = await request(app)
        .post('/api/purchases/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('harus mengembalikan 401 tanpa token', async () => {
      const res = await request(app)
        .post('/api/purchases/checkout')
        .send({ bookIds: ['test-book-1'] });

      expect(res.status).toBe(401);
    });

    it('harus mengembalikan 404 untuk bookId yang tidak ada', async () => {
      const res = await request(app)
        .post('/api/purchases/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookIds: ['nonexistent-book-id'] });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/tidak ditemukan/i);
    });

    it('harus mengembalikan 400 untuk buku tanpa stok', async () => {
      const res = await request(app)
        .post('/api/purchases/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookIds: ['test-book-3'] }); // stock: 0

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/habis/i);
    });
  });

  describe('GET /api/purchases/my-books', () => {
    beforeEach(() => resetData());

    it('harus mengembalikan array kosong untuk user baru (belum beli)', async () => {
      const res = await request(app)
        .get('/api/purchases/my-books')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('harus mengembalikan buku yang sudah dibeli', async () => {
      // Beli dulu
      await request(app)
        .post('/api/purchases/checkout')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookIds: ['test-book-1'] });

      const res = await request(app)
        .get('/api/purchases/my-books')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toHaveProperty('title', 'Test Book One');
      expect(res.body[0]).toHaveProperty('purchaseDate');
    });

    it('harus mengembalikan 401 tanpa token', async () => {
      const res = await request(app).get('/api/purchases/my-books');
      expect(res.status).toBe(401);
    });
  });
});

// ──────────────────────────────────────────────
// 4. BORROWS ENDPOINTS
// ──────────────────────────────────────────────
describe('Borrows Endpoints (/api/borrows)', () => {

  describe('POST /api/borrows', () => {
    beforeEach(() => resetData());

    it('harus berhasil meminjam buku dengan data valid', async () => {
      const res = await request(app)
        .post('/api/borrows')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: 'test-book-1', durationMinutes: 60 });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('borrow');
      expect(res.body.borrow).toHaveProperty('bookId', 'test-book-1');
      expect(res.body.borrow).toHaveProperty('durationMinutes', 60);
      expect(res.body.borrow).toHaveProperty('expiryDate');
      expect(res.body.borrow).toHaveProperty('returned', false);
    });

    it('harus mengembalikan 400 jika bookId tidak ada', async () => {
      const res = await request(app)
        .post('/api/borrows')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ durationMinutes: 30 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('harus mengembalikan 400 jika durationMinutes tidak ada', async () => {
      const res = await request(app)
        .post('/api/borrows')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: 'test-book-1' });

      expect(res.status).toBe(400);
    });

    it('harus mengembalikan 401 tanpa token', async () => {
      const res = await request(app)
        .post('/api/borrows')
        .send({ bookId: 'test-book-1', durationMinutes: 60 });

      expect(res.status).toBe(401);
    });

    it('harus mengembalikan 404 untuk buku yang tidak ada', async () => {
      const res = await request(app)
        .post('/api/borrows')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: 'nonexistent-book', durationMinutes: 60 });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/tidak ditemukan/i);
    });

    it('stok buku harus berkurang setelah dipinjam', async () => {
      await request(app)
        .post('/api/borrows')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: 'test-book-2', durationMinutes: 30 });

      const res = await request(app).get('/api/books/test-book-2');
      expect(res.body.stock).toBe(4); // dari 5 jadi 4
    });

    it('harus mengembalikan 400 untuk buku tanpa stok', async () => {
      const res = await request(app)
        .post('/api/borrows')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: 'test-book-3', durationMinutes: 60 }); // stock: 0

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/borrows/my-borrows', () => {
    beforeEach(() => resetData());

    it('harus mengembalikan array (mungkin kosong) untuk user', async () => {
      const res = await request(app)
        .get('/api/borrows/my-borrows')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('harus mengembalikan buku yang sedang dipinjam', async () => {
      // Pinjam dulu
      await request(app)
        .post('/api/borrows')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bookId: 'test-book-1', durationMinutes: 120 });

      const res = await request(app)
        .get('/api/borrows/my-borrows')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('title', 'Test Book One');
      expect(res.body[0]).toHaveProperty('borrowDetail');
      expect(res.body[0].borrowDetail).toHaveProperty('returned', false);
    });

    it('harus mengembalikan 401 tanpa token', async () => {
      const res = await request(app).get('/api/borrows/my-borrows');
      expect(res.status).toBe(401);
    });
  });
});

// ──────────────────────────────────────────────
// 5. STATUS ENDPOINT
// ──────────────────────────────────────────────
describe('Status Endpoint (/api/status)', () => {
  it('harus mengembalikan status online', async () => {
    const res = await request(app).get('/api/status');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'online');
  });

  it('harus mengandung field database', async () => {
    const res = await request(app).get('/api/status');

    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toBe('local-json');
  });

  it('harus mengandung field aiChatbot', async () => {
    const res = await request(app).get('/api/status');

    expect(res.body).toHaveProperty('aiChatbot');
    // Karena GEMINI_API_KEY kosong, AI seharusnya inactive
    expect(res.body.aiChatbot).toBe('inactive');
  });
});

// ──────────────────────────────────────────────
// 6. CHAT ENDPOINT
// ──────────────────────────────────────────────
describe('Chat Endpoint (/api/chat)', () => {
  it('harus mengembalikan 400 jika message kosong', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/kosong/i);
  });

  it('harus mengembalikan 400 jika message adalah string kosong', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: '' });

    expect(res.status).toBe(400);
  });

  it('harus mengembalikan 503 ketika AI model tidak aktif (API key kosong)', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({ message: 'Halo, rekomendasi buku dong!' });

    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/belum aktif/i);
  });

  it('harus menangani request dengan chatHistory tanpa error', async () => {
    const res = await request(app)
      .post('/api/chat')
      .send({
        message: 'Ada buku apa saja?',
        chatHistory: [{ role: 'user', content: 'Hai' }],
      });

    // Akan tetap 503 karena AI tidak aktif, tapi tidak boleh crash
    expect([400, 503]).toContain(res.status);
  });
});

// ──────────────────────────────────────────────
// 7. INTEGRATION SCENARIOS (End-to-End Flows)
// ──────────────────────────────────────────────
describe('Integration Scenarios', () => {
  beforeEach(() => resetData());

  it('alur lengkap: register → login → beli buku → cek my-books', async () => {
    // 1. Register
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'integrationuser', password: 'integ123' });
    expect(regRes.status).toBe(201);

    // 2. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'integrationuser', password: 'integ123' });
    expect(loginRes.status).toBe(200);

    const token = loginRes.body.token;

    // 3. Checkout
    const checkoutRes = await request(app)
      .post('/api/purchases/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookIds: ['test-book-1'] });
    expect(checkoutRes.status).toBe(201);

    // 4. My Books
    const myBooksRes = await request(app)
      .get('/api/purchases/my-books')
      .set('Authorization', `Bearer ${token}`);
    expect(myBooksRes.status).toBe(200);
    expect(myBooksRes.body).toHaveLength(1);
    expect(myBooksRes.body[0].title).toBe('Test Book One');
  });

  it('alur lengkap: login → pinjam buku → cek my-borrows', async () => {
    // 1. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'user123' });
    const token = loginRes.body.token;

    // 2. Borrow
    const borrowRes = await request(app)
      .post('/api/borrows')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookId: 'test-book-2', durationMinutes: 60 });
    expect(borrowRes.status).toBe(201);

    // 3. My Borrows
    const myBorrowsRes = await request(app)
      .get('/api/borrows/my-borrows')
      .set('Authorization', `Bearer ${token}`);
    expect(myBorrowsRes.status).toBe(200);
    expect(myBorrowsRes.body.length).toBeGreaterThanOrEqual(1);
  });

  it('admin CRUD: tambah → edit → hapus buku', async () => {
    // 1. Tambah
    const addRes = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'CRUD Test Book',
        author: 'CRUD Author',
        genre: 'Testing',
        price: 10000,
        stock: 3,
      });
    expect(addRes.status).toBe(201);
    const bookId = addRes.body.book.id;

    // 2. Edit
    const editRes = await request(app)
      .put(`/api/books/${bookId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'CRUD Test Book — Edited', price: 15000 });
    expect(editRes.status).toBe(200);
    expect(editRes.body.book.title).toBe('CRUD Test Book — Edited');
    expect(editRes.body.book.price).toBe(15000);

    // 3. Hapus
    const deleteRes = await request(app)
      .delete(`/api/books/${bookId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);

    // 4. Verifikasi sudah dihapus
    const getRes = await request(app).get(`/api/books/${bookId}`);
    expect(getRes.status).toBe(404);
  });
});
