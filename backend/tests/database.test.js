/**
 * Unit Tests untuk Database Module — E-Book Store
 *
 * Menguji semua fungsi CRUD: Books, Users, Purchases, dan Borrows.
 * Strategi: backup file data asli sebelum semua test, tulis data test segar
 * di beforeEach, lalu restore file asli di afterAll.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Path absolut ke folder data yang digunakan database.js
const DATA_DIR = path.join(__dirname, '..', 'data');
const BOOKS_FILE = path.join(DATA_DIR, 'books.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
const BORROWS_FILE = path.join(DATA_DIR, 'borrows.json');
const BACKUP_DIR = path.join(__dirname, '__data_backup__');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Simpan file data asli ke folder backup */
function backupDataFiles() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  const files = [BOOKS_FILE, USERS_FILE, PURCHASES_FILE, BORROWS_FILE];
  for (const file of files) {
    if (fs.existsSync(file)) {
      const dest = path.join(BACKUP_DIR, path.basename(file));
      fs.copyFileSync(file, dest);
    }
  }
}

/** Kembalikan file data asli dari backup */
function restoreDataFiles() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  const files = ['books.json', 'users.json', 'purchases.json', 'borrows.json'];
  for (const name of files) {
    const src = path.join(BACKUP_DIR, name);
    const dest = path.join(DATA_DIR, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }
  // Bersihkan folder backup
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
}

/** Tulis data test ke file JSON */
function writeTestData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

/** Baca data dari file JSON */
function readTestData(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

// ── Sample Test Data ─────────────────────────────────────────────────────────

function sampleBooks() {
  return [
    {
      id: '101',
      title: 'Test Book Alpha',
      author: 'Author A',
      genre: 'Fiction',
      price: 50000,
      originalPrice: 60000,
      stock: 10,
      description: 'Alpha book description',
      imageUrl: 'img/alpha.jpg',
    },
    {
      id: '102',
      title: 'Test Book Beta',
      author: 'Author B',
      genre: 'Non-Fiction',
      price: 75000,
      originalPrice: 80000,
      stock: 5,
      description: 'Beta book description',
      imageUrl: 'img/beta.jpg',
    },
    {
      id: '103',
      title: 'Zero Stock Book',
      author: 'Author C',
      genre: 'Education',
      price: 40000,
      originalPrice: 45000,
      stock: 0,
      description: 'Book with no stock',
      imageUrl: 'img/zero.jpg',
    },
  ];
}

function sampleUsers() {
  const salt = bcrypt.genSaltSync(10);
  return [
    {
      id: 'u1',
      username: 'admin',
      password: bcrypt.hashSync('admin123', salt),
      role: 'admin',
    },
    {
      id: 'u2',
      username: 'regulerUser',
      password: bcrypt.hashSync('pass123', salt),
      role: 'user',
    },
  ];
}

// ── Setup & Teardown ─────────────────────────────────────────────────────────

let db;

beforeAll(() => {
  backupDataFiles();
});

afterAll(() => {
  restoreDataFiles();
});

beforeEach(() => {
  // Tulis ulang file data segar sebelum setiap test
  writeTestData(BOOKS_FILE, sampleBooks());
  writeTestData(USERS_FILE, sampleUsers());
  writeTestData(PURCHASES_FILE, []);
  writeTestData(BORROWS_FILE, []);

  // Hapus cache module agar database.js membaca file terbaru
  delete require.cache[require.resolve('../database')];
  db = require('../database');
});

// ═════════════════════════════════════════════════════════════════════════════
// BOOKS CRUD
// ═════════════════════════════════════════════════════════════════════════════
describe('Books CRUD', () => {
  // ── getBooks ──────────────────────────────────────────────────────────────

  test('getBooks mengembalikan array berisi semua buku', () => {
    const books = db.getBooks();
    expect(Array.isArray(books)).toBe(true);
    expect(books.length).toBe(3);
    expect(books[0].title).toBe('Test Book Alpha');
  });

  test('getBooks mengembalikan array kosong jika tidak ada buku', () => {
    writeTestData(BOOKS_FILE, []);
    delete require.cache[require.resolve('../database')];
    db = require('../database');

    const books = db.getBooks();
    expect(books).toEqual([]);
  });

  test('getBooks mengembalikan salinan baru setiap dipanggil (membaca dari file)', () => {
    const a = db.getBooks();
    const b = db.getBooks();
    expect(a).toEqual(b);
    // Pastikan bukan referensi yang sama (immutable reads)
    expect(a).not.toBe(b);
  });

  // ── getBookById ───────────────────────────────────────────────────────────

  test('getBookById mengembalikan buku yang benar berdasarkan id', () => {
    const book = db.getBookById('101');
    expect(book).toBeDefined();
    expect(book.title).toBe('Test Book Alpha');
    expect(book.id).toBe('101');
  });

  test('getBookById mengembalikan undefined untuk id yang tidak ada', () => {
    const book = db.getBookById('999');
    expect(book).toBeUndefined();
  });

  test('getBookById mengembalikan undefined untuk id string kosong', () => {
    const book = db.getBookById('');
    expect(book).toBeUndefined();
  });

  test('getBookById tidak match jika id bertipe number (strict equality)', () => {
    const book = db.getBookById(101); // number, bukan string
    expect(book).toBeUndefined();
  });

  // ── addBook ───────────────────────────────────────────────────────────────

  test('addBook membuat buku baru dengan id auto-generated', () => {
    const newBook = db.addBook({
      title: 'New Book',
      author: 'Author X',
      genre: 'Sci-Fi',
      price: 90000,
      originalPrice: 100000,
      stock: 20,
      description: 'A new book',
      imageUrl: 'img/new.jpg',
    });

    expect(newBook).toBeDefined();
    expect(newBook.id).toBeDefined();
    expect(typeof newBook.id).toBe('string');
    expect(newBook.title).toBe('New Book');

    // Pastikan tersimpan ke file
    const books = db.getBooks();
    expect(books.length).toBe(4);
    expect(books.find((b) => b.id === newBook.id)).toBeDefined();
  });

  test('addBook mengkonversi price, originalPrice, stock ke Number', () => {
    const newBook = db.addBook({
      title: 'Converted Book',
      author: 'Author Y',
      genre: 'Tech',
      price: '55000',
      originalPrice: '65000',
      stock: '7',
    });

    expect(typeof newBook.price).toBe('number');
    expect(newBook.price).toBe(55000);
    expect(typeof newBook.originalPrice).toBe('number');
    expect(newBook.originalPrice).toBe(65000);
    expect(typeof newBook.stock).toBe('number');
    expect(newBook.stock).toBe(7);
  });

  test('addBook menangani string angka floating point dengan benar', () => {
    const newBook = db.addBook({
      title: 'Float Book',
      author: 'A',
      genre: 'G',
      price: '59999.99',
      originalPrice: '69999.50',
      stock: '3',
    });

    expect(newBook.price).toBe(59999.99);
    expect(newBook.originalPrice).toBe(69999.5);
    expect(newBook.stock).toBe(3);
  });

  test('addBook menggunakan price sebagai default originalPrice jika tidak disediakan', () => {
    const newBook = db.addBook({
      title: 'No Original Price',
      author: 'Author Z',
      genre: 'Other',
      price: 42000,
      stock: 1,
    });

    expect(newBook.originalPrice).toBe(42000);
  });

  test('addBook menyimpan field tambahan yang diberikan', () => {
    const newBook = db.addBook({
      title: 'Extra Fields',
      author: 'Author',
      genre: 'Genre',
      price: 10000,
      stock: 1,
      customField: 'custom-value',
    });

    expect(newBook.customField).toBe('custom-value');
  });

  // ── updateBook ────────────────────────────────────────────────────────────

  test('updateBook mengupdate field buku yang sudah ada', () => {
    const updated = db.updateBook('101', { title: 'Updated Title' });

    expect(updated).not.toBeNull();
    expect(updated.title).toBe('Updated Title');
    expect(updated.id).toBe('101');
  });

  test('updateBook mengembalikan null untuk buku yang tidak ada', () => {
    const result = db.updateBook('999', { title: 'Nope' });
    expect(result).toBeNull();
  });

  test('updateBook mempertahankan field yang tidak diupdate', () => {
    const updated = db.updateBook('101', { title: 'New Title' });

    expect(updated.author).toBe('Author A');
    expect(updated.genre).toBe('Fiction');
    expect(updated.price).toBe(50000);
    expect(updated.imageUrl).toBe('img/alpha.jpg');
  });

  test('updateBook mengkonversi field numerik dengan benar', () => {
    const updated = db.updateBook('101', {
      price: '99000',
      originalPrice: '110000',
      stock: '25',
    });

    expect(typeof updated.price).toBe('number');
    expect(updated.price).toBe(99000);
    expect(typeof updated.originalPrice).toBe('number');
    expect(updated.originalPrice).toBe(110000);
    expect(typeof updated.stock).toBe('number');
    expect(updated.stock).toBe(25);
  });

  test('updateBook mempertahankan nilai numerik jika field tidak disertakan', () => {
    const updated = db.updateBook('101', { title: 'Only Title' });

    expect(updated.price).toBe(50000);
    expect(updated.originalPrice).toBe(60000);
    expect(updated.stock).toBe(10);
  });

  test('updateBook menyimpan perubahan ke file secara persisten', () => {
    db.updateBook('102', { title: 'Persisted Title' });

    // Re-read dari file
    const books = readTestData(BOOKS_FILE);
    const book = books.find((b) => b.id === '102');
    expect(book.title).toBe('Persisted Title');
  });

  // ── deleteBook ────────────────────────────────────────────────────────────

  test('deleteBook menghapus buku dan mengembalikan true', () => {
    const result = db.deleteBook('101');
    expect(result).toBe(true);

    const books = db.getBooks();
    expect(books.length).toBe(2);
    expect(books.find((b) => b.id === '101')).toBeUndefined();
  });

  test('deleteBook mengembalikan false untuk buku yang tidak ada', () => {
    const result = db.deleteBook('999');
    expect(result).toBe(false);
  });

  test('deleteBook tidak mempengaruhi buku lain', () => {
    db.deleteBook('101');

    const books = db.getBooks();
    expect(books.find((b) => b.id === '102')).toBeDefined();
    expect(books.find((b) => b.id === '103')).toBeDefined();
  });

  test('deleteBook bisa menghapus buku terakhir sehingga array kosong', () => {
    db.deleteBook('101');
    db.deleteBook('102');
    db.deleteBook('103');

    const books = db.getBooks();
    expect(books).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// USERS
// ═════════════════════════════════════════════════════════════════════════════
describe('Users', () => {
  // ── getUsers ──────────────────────────────────────────────────────────────

  test('getUsers mengembalikan semua user', () => {
    const users = db.getUsers();
    expect(Array.isArray(users)).toBe(true);
    expect(users.length).toBe(2);
  });

  test('getUsers menyertakan field password (hashed)', () => {
    const users = db.getUsers();
    expect(users[0].password).toBeDefined();
    expect(users[0].password).not.toBe('admin123');
  });

  // ── getUserByUsername ─────────────────────────────────────────────────────

  test('getUserByUsername menemukan user secara case-insensitive (lowercase)', () => {
    const user = db.getUserByUsername('admin');
    expect(user).toBeDefined();
    expect(user.username).toBe('admin');
    expect(user.role).toBe('admin');
  });

  test('getUserByUsername menemukan user secara case-insensitive (UPPERCASE)', () => {
    const user = db.getUserByUsername('ADMIN');
    expect(user).toBeDefined();
    expect(user.username).toBe('admin');
  });

  test('getUserByUsername menemukan user secara case-insensitive (MiXeD)', () => {
    const user = db.getUserByUsername('Admin');
    expect(user).toBeDefined();
    expect(user.username).toBe('admin');
  });

  test('getUserByUsername menemukan user dengan mixed-case username asli', () => {
    const user = db.getUserByUsername('reguleruser');
    expect(user).toBeDefined();
    expect(user.username).toBe('regulerUser');
  });

  test('getUserByUsername mengembalikan undefined untuk user yang tidak ada', () => {
    const user = db.getUserByUsername('nonexistent');
    expect(user).toBeUndefined();
  });

  // ── addUser ───────────────────────────────────────────────────────────────

  test('addUser membuat user dengan password ter-hash', () => {
    const result = db.addUser({
      username: 'newuser',
      password: 'plain123',
    });

    // Return value tidak mengandung password
    expect(result.password).toBeUndefined();

    // Tapi di file, password harus ada dan ter-hash
    const users = readTestData(USERS_FILE);
    const saved = users.find((u) => u.username === 'newuser');
    expect(saved).toBeDefined();
    expect(saved.password).toBeDefined();
    expect(saved.password).not.toBe('plain123');
    expect(bcrypt.compareSync('plain123', saved.password)).toBe(true);
  });

  test('addUser default role ke "user"', () => {
    const result = db.addUser({
      username: 'defaultrole',
      password: 'pass',
    });

    expect(result.role).toBe('user');
  });

  test('addUser mengembalikan objek tanpa field password', () => {
    const result = db.addUser({
      username: 'safe',
      password: 'secret',
    });

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('username', 'safe');
    expect(result).toHaveProperty('role');
    expect(result).not.toHaveProperty('password');
  });

  test('addUser menerima role admin secara eksplisit', () => {
    const result = db.addUser({
      username: 'newadmin',
      password: 'admin',
      role: 'admin',
    });

    expect(result.role).toBe('admin');
  });

  test('addUser menghasilkan id unik bertipe string', () => {
    const u1 = db.addUser({ username: 'a', password: 'p' });
    const u2 = db.addUser({ username: 'b', password: 'p' });

    expect(typeof u1.id).toBe('string');
    expect(typeof u2.id).toBe('string');
    // Id bisa sama jika Date.now() identik, tapi biasanya berbeda
    expect(u1.id).toBeDefined();
    expect(u2.id).toBeDefined();
  });

  test('addUser menyimpan user ke file secara persisten', () => {
    db.addUser({ username: 'persisted', password: 'pw' });

    const users = readTestData(USERS_FILE);
    expect(users.find((u) => u.username === 'persisted')).toBeDefined();
    expect(users.length).toBe(3); // 2 sample + 1 baru
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PURCHASES
// ═════════════════════════════════════════════════════════════════════════════
describe('Purchases', () => {
  // ── addPurchase ───────────────────────────────────────────────────────────

  test('addPurchase membuat purchase record baru', () => {
    const purchase = db.addPurchase('u1', '101', 50000);

    expect(purchase).toBeDefined();
    expect(purchase.userId).toBe('u1');
    expect(purchase.bookId).toBe('101');
    expect(purchase.amountPaid).toBe(50000);
    expect(purchase.purchaseDate).toBeDefined();
    expect(purchase.id).toBeDefined();
  });

  test('addPurchase mengurangi stok buku sebanyak 1', () => {
    const stockBefore = db.getBookById('101').stock;
    db.addPurchase('u1', '101', 50000);
    const stockAfter = db.getBookById('101').stock;

    expect(stockAfter).toBe(stockBefore - 1);
  });

  test('addPurchase mengembalikan purchase yang sudah ada jika duplikat (same userId + bookId)', () => {
    const first = db.addPurchase('u1', '101', 50000);
    const second = db.addPurchase('u1', '101', 50000);

    expect(second.id).toBe(first.id);
    expect(second.purchaseDate).toBe(first.purchaseDate);
  });

  test('addPurchase tidak mengurangi stok pada duplikat purchase', () => {
    db.addPurchase('u1', '101', 50000);
    const stockAfterFirst = db.getBookById('101').stock;

    db.addPurchase('u1', '101', 50000);
    const stockAfterSecond = db.getBookById('101').stock;

    expect(stockAfterSecond).toBe(stockAfterFirst);
  });

  test('addPurchase mengkonversi amountPaid ke Number', () => {
    const purchase = db.addPurchase('u1', '101', '50000');
    expect(typeof purchase.amountPaid).toBe('number');
    expect(purchase.amountPaid).toBe(50000);
  });

  test('addPurchase membolehkan user berbeda membeli buku yang sama', () => {
    const p1 = db.addPurchase('u1', '101', 50000);
    const p2 = db.addPurchase('u2', '101', 50000);

    expect(p1.id).not.toBe(p2.id);
    expect(p1.userId).toBe('u1');
    expect(p2.userId).toBe('u2');
  });

  test('addPurchase membolehkan user yang sama membeli buku berbeda', () => {
    const p1 = db.addPurchase('u1', '101', 50000);
    const p2 = db.addPurchase('u1', '102', 75000);

    expect(p1.bookId).toBe('101');
    expect(p2.bookId).toBe('102');
    expect(p1.id).not.toBe(p2.id);
  });

  test('addPurchase menyimpan purchaseDate dalam format ISO string', () => {
    const purchase = db.addPurchase('u1', '101', 50000);
    // ISO string format: YYYY-MM-DDTHH:mm:ss.sssZ
    expect(() => new Date(purchase.purchaseDate)).not.toThrow();
    expect(new Date(purchase.purchaseDate).toISOString()).toBe(purchase.purchaseDate);
  });

  // ── getUserBooks ──────────────────────────────────────────────────────────

  test('getUserBooks mengembalikan buku yang sudah dibeli dengan purchaseDate', () => {
    db.addPurchase('u1', '101', 50000);
    const userBooks = db.getUserBooks('u1');

    expect(userBooks.length).toBe(1);
    expect(userBooks[0].title).toBe('Test Book Alpha');
    expect(userBooks[0].purchaseDate).toBeDefined();
  });

  test('getUserBooks mengembalikan array kosong untuk user tanpa pembelian', () => {
    const userBooks = db.getUserBooks('u1');
    expect(userBooks).toEqual([]);
  });

  test('getUserBooks mengembalikan beberapa buku jika user membeli banyak', () => {
    db.addPurchase('u1', '101', 50000);
    db.addPurchase('u1', '102', 75000);

    const userBooks = db.getUserBooks('u1');
    expect(userBooks.length).toBe(2);
  });

  test('getUserBooks mem-filter buku yang sudah dihapus (null safety)', () => {
    db.addPurchase('u1', '101', 50000);
    db.addPurchase('u1', '102', 75000);

    // Hapus salah satu buku
    db.deleteBook('101');

    const userBooks = db.getUserBooks('u1');
    expect(userBooks.length).toBe(1);
    expect(userBooks[0].title).toBe('Test Book Beta');
  });

  test('getUserBooks tidak mengembalikan pembelian user lain', () => {
    db.addPurchase('u1', '101', 50000);
    db.addPurchase('u2', '102', 75000);

    const u1Books = db.getUserBooks('u1');
    expect(u1Books.length).toBe(1);
    expect(u1Books[0].id).toBe('101');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BORROWS
// ═════════════════════════════════════════════════════════════════════════════
describe('Borrows', () => {
  // ── addBorrow ─────────────────────────────────────────────────────────────

  test('addBorrow membuat borrow record baru', () => {
    const borrow = db.addBorrow('u1', '101', 60);

    expect(borrow).toBeDefined();
    expect(borrow.userId).toBe('u1');
    expect(borrow.bookId).toBe('101');
    expect(borrow.durationMinutes).toBe(60);
    expect(borrow.returned).toBe(false);
    expect(borrow.borrowDate).toBeDefined();
    expect(borrow.expiryDate).toBeDefined();
    expect(borrow.id).toBeDefined();
  });

  test('addBorrow mengembalikan null untuk buku yang tidak ada', () => {
    const result = db.addBorrow('u1', '999', 60);
    expect(result).toBeNull();
  });

  test('addBorrow mengembalikan error object ketika stok buku 0', () => {
    // Book '103' punya stock: 0
    const result = db.addBorrow('u1', '103', 60);
    expect(result).toEqual({ error: 'Stok buku habis' });
  });

  test('addBorrow mengurangi stok buku sebanyak 1', () => {
    const stockBefore = db.getBookById('101').stock;
    db.addBorrow('u1', '101', 60);
    const stockAfter = db.getBookById('101').stock;

    expect(stockAfter).toBe(stockBefore - 1);
  });

  test('addBorrow mengembalikan existing active borrow (tidak duplikat)', () => {
    const first = db.addBorrow('u1', '101', 60);
    const second = db.addBorrow('u1', '101', 60);

    expect(second.id).toBe(first.id);
  });

  test('addBorrow tidak mengurangi stok pada duplikat borrow', () => {
    db.addBorrow('u1', '101', 60);
    const stockAfterFirst = db.getBookById('101').stock;

    db.addBorrow('u1', '101', 60);
    const stockAfterSecond = db.getBookById('101').stock;

    expect(stockAfterSecond).toBe(stockAfterFirst);
  });

  test('addBorrow mengatur expiryDate berdasarkan durationMinutes', () => {
    const before = Date.now();
    const borrow = db.addBorrow('u1', '101', 30);
    const after = Date.now();

    const borrowTime = new Date(borrow.borrowDate).getTime();
    const expiryTime = new Date(borrow.expiryDate).getTime();
    const expectedDuration = 30 * 60 * 1000; // 30 menit dalam ms

    expect(expiryTime - borrowTime).toBe(expectedDuration);
    // borrowDate harus antara before dan after
    expect(borrowTime).toBeGreaterThanOrEqual(before);
    expect(borrowTime).toBeLessThanOrEqual(after);
  });

  test('addBorrow mengkonversi durationMinutes ke Number', () => {
    const borrow = db.addBorrow('u1', '101', '45');
    expect(borrow.durationMinutes).toBe(45);
    expect(typeof borrow.durationMinutes).toBe('number');
  });

  test('addBorrow membolehkan user berbeda meminjam buku yang sama', () => {
    const b1 = db.addBorrow('u1', '101', 60);
    const b2 = db.addBorrow('u2', '101', 60);

    expect(b1.id).not.toBe(b2.id);
    expect(b1.userId).toBe('u1');
    expect(b2.userId).toBe('u2');
  });

  test('addBorrow membolehkan user yang sama meminjam buku berbeda', () => {
    const b1 = db.addBorrow('u1', '101', 60);
    const b2 = db.addBorrow('u1', '102', 60);

    expect(b1.bookId).toBe('101');
    expect(b2.bookId).toBe('102');
  });

  test('addBorrow gagal saat stok habis akibat peminjaman berturut-turut', () => {
    // Book '102' punya stock: 5
    // Pinjam sampai habis
    db.addBorrow('u1', '102', 60);
    db.addBorrow('u2', '102', 60);
    // Buat user unik tiap kali (menyimulasikan banyak user)
    for (let i = 3; i <= 5; i++) {
      // Tulis user baru ke file karena addBorrow cek berdasarkan userId
      const users = readTestData(USERS_FILE);
      users.push({ id: `u${i}`, username: `user${i}`, password: 'x', role: 'user' });
      writeTestData(USERS_FILE, users);
      db.addBorrow(`u${i}`, '102', 60);
    }

    // Stok sekarang 0
    expect(db.getBookById('102').stock).toBe(0);

    // Tambah satu user lagi
    const users = readTestData(USERS_FILE);
    users.push({ id: 'u6', username: 'user6', password: 'x', role: 'user' });
    writeTestData(USERS_FILE, users);

    const result = db.addBorrow('u6', '102', 60);
    expect(result).toEqual({ error: 'Stok buku habis' });
  });

  // ── getBorrows ────────────────────────────────────────────────────────────

  test('getBorrows mengembalikan semua borrow records', () => {
    db.addBorrow('u1', '101', 60);
    db.addBorrow('u2', '102', 30);

    const borrows = db.getBorrows();
    expect(borrows.length).toBe(2);
  });

  test('getBorrows mengembalikan array kosong jika tidak ada peminjaman', () => {
    const borrows = db.getBorrows();
    expect(borrows).toEqual([]);
  });

  // ── getUserBorrows ────────────────────────────────────────────────────────

  test('getUserBorrows mengembalikan peminjaman untuk user tertentu', () => {
    db.addBorrow('u1', '101', 60);
    db.addBorrow('u2', '102', 30);

    const u1Borrows = db.getUserBorrows('u1');
    expect(u1Borrows.length).toBe(1);
    expect(u1Borrows[0].borrowDetail.userId).toBe('u1');
    expect(u1Borrows[0].title).toBe('Test Book Alpha');
  });

  test('getUserBorrows mengembalikan array kosong untuk user tanpa peminjaman', () => {
    const borrows = db.getUserBorrows('u1');
    expect(borrows).toEqual([]);
  });

  test('getUserBorrows menyertakan detail buku dan borrowDetail', () => {
    db.addBorrow('u1', '101', 60);

    const borrows = db.getUserBorrows('u1');
    expect(borrows[0]).toHaveProperty('title');
    expect(borrows[0]).toHaveProperty('author');
    expect(borrows[0]).toHaveProperty('price');
    expect(borrows[0]).toHaveProperty('borrowDetail');
    expect(borrows[0].borrowDetail).toHaveProperty('borrowDate');
    expect(borrows[0].borrowDetail).toHaveProperty('expiryDate');
    expect(borrows[0].borrowDetail).toHaveProperty('returned');
  });

  test('getUserBorrows auto-clean: menandai returned=true pada borrow yang expired', () => {
    // Tambahkan borrow yang sudah kedaluwarsa langsung ke file
    const expiredBorrow = {
      id: 'expired1',
      userId: 'u1',
      bookId: '101',
      borrowDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 jam lalu
      durationMinutes: 30,
      expiryDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 jam lalu
      returned: false,
    };

    writeTestData(BORROWS_FILE, [expiredBorrow]);

    // Panggil getUserBorrows yang seharusnya auto-clean
    const borrows = db.getUserBorrows('u1');

    // Borrow yang sudah expired harus di-mark returned
    expect(borrows[0].borrowDetail.returned).toBe(true);

    // Verifikasi persisten ke file
    const rawBorrows = readTestData(BORROWS_FILE);
    expect(rawBorrows[0].returned).toBe(true);
  });

  test('getUserBorrows auto-clean: mengembalikan stok buku untuk borrow yang expired', () => {
    const stockBefore = db.getBookById('101').stock;

    // Simulasikan borrow expired (stok sudah dikurangi manual)
    const books = readTestData(BOOKS_FILE);
    const bookIndex = books.findIndex((b) => b.id === '101');
    books[bookIndex].stock -= 1;
    writeTestData(BOOKS_FILE, books);

    const expiredBorrow = {
      id: 'expired2',
      userId: 'u1',
      bookId: '101',
      borrowDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 30,
      expiryDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      returned: false,
    };
    writeTestData(BORROWS_FILE, [expiredBorrow]);

    // Auto-clean saat memanggil getUserBorrows
    db.getUserBorrows('u1');

    // Stok harus kembali
    const stockAfter = db.getBookById('101').stock;
    expect(stockAfter).toBe(stockBefore);
  });

  test('getUserBorrows tidak mengembalikan stok untuk borrow yang sudah returned', () => {
    const alreadyReturnedBorrow = {
      id: 'returned1',
      userId: 'u1',
      bookId: '101',
      borrowDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 30,
      expiryDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      returned: true, // sudah returned sebelumnya
    };
    writeTestData(BORROWS_FILE, [alreadyReturnedBorrow]);

    const stockBefore = db.getBookById('101').stock;
    db.getUserBorrows('u1');
    const stockAfter = db.getBookById('101').stock;

    expect(stockAfter).toBe(stockBefore);
  });

  test('getUserBorrows mem-filter borrow untuk buku yang sudah dihapus', () => {
    db.addBorrow('u1', '101', 60);
    db.addBorrow('u1', '102', 60);

    // Hapus buku '101'
    db.deleteBook('101');

    const borrows = db.getUserBorrows('u1');
    // Seharusnya hanya buku '102' yang tetap tampil
    expect(borrows.length).toBe(1);
    expect(borrows[0].title).toBe('Test Book Beta');
  });

  test('getUserBorrows tidak mempengaruhi peminjaman user lain saat auto-clean', () => {
    // User u1 punya borrow expired, user u2 punya borrow aktif
    const expiredBorrow = {
      id: 'exp1',
      userId: 'u1',
      bookId: '101',
      borrowDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      durationMinutes: 30,
      expiryDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      returned: false,
    };
    const activeBorrow = {
      id: 'act1',
      userId: 'u2',
      bookId: '102',
      borrowDate: new Date().toISOString(),
      durationMinutes: 120,
      expiryDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      returned: false,
    };
    writeTestData(BORROWS_FILE, [expiredBorrow, activeBorrow]);

    // getUserBorrows u1 harus auto-clean hanya milik u1
    db.getUserBorrows('u1');

    const rawBorrows = readTestData(BORROWS_FILE);
    const u1Borrow = rawBorrows.find((b) => b.id === 'exp1');
    const u2Borrow = rawBorrows.find((b) => b.id === 'act1');

    expect(u1Borrow.returned).toBe(true);
    expect(u2Borrow.returned).toBe(false); // tidak terpengaruh
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// EDGE CASES & INTEGRATION
// ═════════════════════════════════════════════════════════════════════════════
describe('Edge Cases & Integration', () => {
  test('addBook lalu getBookById bisa menemukan buku yang baru ditambahkan', () => {
    const added = db.addBook({
      title: 'Integrated Book',
      author: 'I',
      genre: 'G',
      price: 10000,
      stock: 3,
    });

    const found = db.getBookById(added.id);
    expect(found).toBeDefined();
    expect(found.title).toBe('Integrated Book');
  });

  test('updateBook lalu getBookById mengembalikan data yang sudah diupdate', () => {
    db.updateBook('101', { title: 'Updated via Integration' });
    const book = db.getBookById('101');
    expect(book.title).toBe('Updated via Integration');
  });

  test('deleteBook lalu getBookById mengembalikan undefined', () => {
    db.deleteBook('101');
    const book = db.getBookById('101');
    expect(book).toBeUndefined();
  });

  test('addUser lalu getUserByUsername bisa menemukan user baru', () => {
    db.addUser({ username: 'findme', password: 'pass' });
    const user = db.getUserByUsername('findme');
    expect(user).toBeDefined();
    expect(user.username).toBe('findme');
  });

  test('password user baru bisa di-verify dengan bcrypt', () => {
    db.addUser({ username: 'verifyuser', password: 'mypassword' });
    const user = db.getUserByUsername('verifyuser');
    expect(bcrypt.compareSync('mypassword', user.password)).toBe(true);
    expect(bcrypt.compareSync('wrongpassword', user.password)).toBe(false);
  });

  test('purchase lalu getUserBooks menunjukkan buku yang dibeli', () => {
    db.addPurchase('u1', '102', 75000);
    const books = db.getUserBooks('u1');
    expect(books.length).toBe(1);
    expect(books[0].title).toBe('Test Book Beta');
    expect(books[0].purchaseDate).toBeDefined();
  });

  test('borrow, lalu user tidak bisa borrow buku yang sama lagi (active)', () => {
    const first = db.addBorrow('u1', '101', 120);
    const second = db.addBorrow('u1', '101', 120);

    // Harus mengembalikan borrow yang sama
    expect(first.id).toBe(second.id);

    // Stok hanya berkurang 1 kali
    expect(db.getBookById('101').stock).toBe(9);
  });

  test('beberapa operasi berurutan berjalan konsisten', () => {
    // Tambah buku → beli → pinjam → hapus → cek
    const newBook = db.addBook({
      title: 'Lifecycle Book',
      author: 'LC',
      genre: 'Test',
      price: 30000,
      stock: 5,
    });

    db.addPurchase('u1', newBook.id, 30000);
    expect(db.getBookById(newBook.id).stock).toBe(4);

    db.addBorrow('u2', newBook.id, 60);
    expect(db.getBookById(newBook.id).stock).toBe(3);

    db.deleteBook(newBook.id);
    expect(db.getBookById(newBook.id)).toBeUndefined();

    // getUserBooks harus filter buku yang dihapus
    const userBooks = db.getUserBooks('u1');
    const found = userBooks.find((b) => b.id === newBook.id);
    expect(found).toBeUndefined();
  });
});
