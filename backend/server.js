require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { GoogleGenAI } = require('@google/genai');

const db = require('./database');
const { verifyToken, requireAdmin, JWT_SECRET } = require('./middleware/auth');

const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
// Sajikan berkas statis dari folder induk (frontend UTS Web)
app.use(express.static(path.join(__dirname, '..')));

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inisialisasi Google Cloud Vertex AI menggunakan SDK baru (@google/genai)
const project = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_LOCATION || 'us-central1';
const geminiApiKey = process.env.GEMINI_API_KEY;

let ai = null;
let googleAI = null;
let aiModelName = 'gemini-1.5-flash';

if (project && process.env.NODE_ENV !== 'test') {
  try {
    ai = new GoogleGenAI({ 
      project: project, 
      location: location, 
      vertexai: { project: project, location: location } 
    });
    console.log(`Vertex AI (${aiModelName}) diinisialisasi di ${location}.`);
  } catch (error) {
    console.error('Gagal inisialisasi Vertex AI:', error.message);
  }
}

if (geminiApiKey && process.env.NODE_ENV !== 'test') {
  try {
    googleAI = new GoogleGenerativeAI(geminiApiKey);
    console.log(`Google AI (Gemini API Key) diinisialisasi sebagai cadangan. (Length: ${geminiApiKey.length})`);
  } catch (error) {
    console.error('Gagal inisialisasi Google AI:', error.message);
  }
}

// ... rest of authentication endpoints ...

// ==========================================
// 1. ENDPOINTS AUTENTIKASI (Register & Login)
// ==========================================

// Register User Baru (Default role: user)
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi' });
  }

  try {
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username sudah digunakan' });
    }

    const newUser = await db.addUser({ username, password, role: 'user' });
    res.status(201).json({
      message: 'Registrasi berhasil',
      user: newUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan server saat registrasi', error: error.message });
  }
});

// Login User & Admin
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi' });
  }

  try {
    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(400).json({ message: 'Username atau password salah' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Username atau password salah' });
    }

    // Buat Token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan server saat login', error: error.message });
  }
});

// Verifikasi Sesi Token (Untuk Frontend checking)
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const user = await db.getUserByUsername(req.user.username);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan server', error: error.message });
  }
});

// ==========================================
// 2. ENDPOINTS BUKU (Public Read, Admin CRUD)
// ==========================================

// Ambil semua buku (Public Read)
app.get('/api/books', async (req, res) => {
  try {
    const books = await db.getBooks();
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data buku', error: error.message });
  }
});

// Ambil detail buku berdasarkan ID (Public Read)
app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await db.getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data detail buku', error: error.message });
  }
});

// Tambah Buku Baru (Hanya Admin)
app.post('/api/books', verifyToken, requireAdmin, async (req, res) => {
  const { title, author, genre, price, originalPrice, stock, description, imageUrl } = req.body;

  if (!title || !author || !genre || price === undefined || stock === undefined) {
    return res.status(400).json({ message: 'Judul, penulis, kategori, harga, dan stok wajib diisi' });
  }

  try {
    const newBook = await db.addBook({
      title,
      author,
      genre,
      price,
      originalPrice,
      stock,
      description,
      imageUrl
    });
    res.status(201).json({ message: 'Buku berhasil ditambahkan', book: newBook });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambahkan buku ke database', error: error.message });
  }
});

// Update Buku (Hanya Admin)
app.put('/api/books/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const updatedBook = await db.updateBook(req.params.id, req.body);
    if (!updatedBook) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' });
    }
    res.json({ message: 'Data buku berhasil diperbarui', book: updatedBook });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memperbarui data buku', error: error.message });
  }
});

// Hapus Buku (Hanya Admin)
app.delete('/api/books/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const success = await db.deleteBook(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' });
    }
    res.json({ message: 'Buku berhasil dihapus dari katalog' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus buku', error: error.message });
  }
});

// ==========================================
// 3. ENDPOINTS TRANSAKSI & AI CHATBOT
// ==========================================

// Chatbot AI Rekomendasi
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Pesan tidak boleh kosong' });
  }

  if (!ai && !googleAI || process.env.NODE_ENV === 'test') {
    return res.status(503).json({ message: 'Layanan AI belum aktif' });
  }

  try {
    // Ambil data buku terbaru dari database untuk konteks AI
    let books = [];
    try {
      books = await db.getBooks();
    } catch (dbError) {
      console.warn('[Chatbot] Gagal mengambil data buku dari database, menggunakan daftar kosong:', dbError.message);
      // Opsional: Coba ambil dari file JSON jika database mati
      const booksPath = path.join(__dirname, 'data', 'books.json');
      if (fs.existsSync(booksPath)) {
        try {
          books = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
          console.log('[Chatbot] Berhasil menggunakan fallback data dari books.json');
        } catch (jsonError) {
          console.error('[Chatbot] Gagal membaca fallback JSON:', jsonError.message);
        }
      }
    }
    
    const context = `
      Anda adalah asisten virtual "E-Book Store". 
      Tugas Anda adalah membantu pengguna memilih buku, memberikan rekomendasi, dan menjawab pertanyaan seputar koleksi buku kami.
      
      Data Buku Saat Ini:
      ${JSON.stringify(books.map(b => ({ title: b.title, author: b.author, genre: b.genre, price: b.price, stock: b.stock })))}
      
      Aturan:
      1. Jawablah dengan ramah dan profesional.
      2. Gunakan data buku di atas untuk memberikan rekomendasi yang akurat.
      3. Jika stok buku 0, katakan bahwa buku tersebut sedang habis.
      4. Jika user menanyakan buku yang tidak ada di daftar, sarankan buku lain yang genrenya mirip.
    `;

    const prompt = `${context}\n\nUser: ${message}`;
    let replyText = "";

    // ATTEMPT 1: Vertex AI (Primary)
    if (ai) {
      try {
        console.log(`[AI] Attempting Vertex AI with ${aiModelName}...`);
        const result = await ai.models.generateContent({
            model: aiModelName,
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        replyText = result.response ? result.response.text() : (result.text || "");
      } catch (vertexError) {
        console.error('[AI] Vertex AI Failed:', vertexError.message);
      }
    }

    // ATTEMPT 2: Google AI (Standard Gemini API)
    if (!replyText && googleAI) {
      const modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
      for (const modelName of modelsToTry) {
        try {
          console.log(`[AI] Attempting Google AI (Standard) with ${modelName}...`);
          const model = googleAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          replyText = result.response.text();
          if (replyText) break;
        } catch (googleError) {
          console.error(`[AI] Google AI (${modelName}) Failed:`, googleError.message);
        }
      }
    }
    
    if (!replyText) {
      throw new Error('Semua layanan AI gagal memberikan respon. Pastikan API Key valid dan Vertex AI sudah aktif.');
    }

    res.json({ reply: replyText });
  } catch (error) {
    console.error('--- ERROR DETAIL CHATBOT ---');
    console.error(error); 
    
    let userMessage = 'Terjadi kesalahan pada layanan AI';
    if (error.message && error.message.includes('FAILED_PRECONDITION')) {
      userMessage = 'Gagal mengakses AI: Pastikan Vertex AI API sudah aktif di GCP Console.';
    }
    
    res.status(500).json({ message: userMessage, error: error.message });
  }
});

// Beli Buku (Purchase - Singular)
app.post('/api/purchase', verifyToken, async (req, res) => {
  const { bookId } = req.body;
  const userId = req.user.id;

  if (!bookId) {
    return res.status(400).json({ message: 'ID Buku wajib diisi' });
  }

  try {
    const book = await db.getBookById(bookId);
    if (!book) return res.status(404).json({ message: 'Buku tidak ditemukan' });
    if (book.stock <= 0) return res.status(400).json({ message: 'Stok buku habis' });

    const purchase = await db.addPurchase(userId, bookId, book.price);
    res.json({ message: 'Pembelian berhasil', purchase });
  } catch (error) {
    res.status(500).json({ message: 'Gagal melakukan pembelian', error: error.message });
  }
});

// Checkout Buku (Purchase - Plural / Bulk Checkout)
app.post('/api/purchases/checkout', verifyToken, async (req, res) => {
  const { bookIds } = req.body;
  const userId = req.user.id;

  if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
    return res.status(400).json({ message: 'bookIds wajib diisi dalam bentuk array dan tidak boleh kosong' });
  }

  try {
    // 1. Validasi semua bookIds terlebih dahulu
    const booksToBuy = [];
    for (const bookId of bookIds) {
      const book = await db.getBookById(bookId);
      if (!book) {
        return res.status(404).json({ message: `Buku dengan ID ${bookId} tidak ditemukan` });
      }
      if (book.stock <= 0) {
        return res.status(400).json({ message: `Stok buku "${book.title}" habis` });
      }
      booksToBuy.push(book);
    }

    // 2. Jika validasi lolos, lakukan pembelian
    const purchases = [];
    for (const book of booksToBuy) {
      const purchase = await db.addPurchase(userId, book.id, book.price);
      purchases.push(purchase);
    }

    res.status(201).json({
      message: 'Pembelian berhasil',
      purchases
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memproses transaksi checkout', error: error.message });
  }
});

// Ambil Koleksi Buku Saya (Pembelian - Singular)
app.get('/api/my-books', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const myBooks = await db.getUserBooks(userId);
    res.json(myBooks);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data buku saya', error: error.message });
  }
});

// Ambil Koleksi Buku Saya (Pembelian - Plural)
app.get('/api/purchases/my-books', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const myBooks = await db.getUserBooks(userId);
    res.json(myBooks);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data buku saya', error: error.message });
  }
});

// Pinjam Buku (Borrow - Singular)
app.post('/api/borrow', verifyToken, async (req, res) => {
  const { bookId, durationMinutes } = req.body;
  const userId = req.user.id;

  if (!bookId || !durationMinutes) {
    return res.status(400).json({ message: 'ID Buku dan durasi wajib diisi' });
  }

  try {
    const borrow = await db.addBorrow(userId, bookId, durationMinutes);
    if (borrow && borrow.error) {
      return res.status(400).json({ message: borrow.error });
    }
    if (!borrow) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' });
    }

    res.json({ message: 'Peminjaman berhasil', borrow });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memproses peminjaman', error: error.message });
  }
});

// Pinjam Buku (Borrow - Plural)
app.post('/api/borrows', verifyToken, async (req, res) => {
  const { bookId, durationMinutes } = req.body;
  const userId = req.user.id;

  if (!bookId || durationMinutes === undefined) {
    return res.status(400).json({ message: 'ID Buku dan durasi wajib diisi' });
  }

  try {
    const book = await db.getBookById(bookId);
    if (!book) {
      return res.status(404).json({ message: 'Buku tidak ditemukan' });
    }
    if (book.stock <= 0) {
      return res.status(400).json({ message: 'Stok buku habis' });
    }

    const borrow = await db.addBorrow(userId, bookId, durationMinutes);
    if (borrow && borrow.error) {
      return res.status(400).json({ message: borrow.error });
    }

    res.status(201).json({ message: 'Peminjaman berhasil', borrow });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memproses peminjaman', error: error.message });
  }
});

// Ambil Daftar Pinjaman Saya (Singular)
app.get('/api/my-borrows', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const myBorrows = await db.getUserBorrows(userId);
    res.json(myBorrows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data pinjaman', error: error.message });
  }
});

// Ambil Daftar Pinjaman Saya (Plural)
app.get('/api/borrows/my-borrows', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const myBorrows = await db.getUserBorrows(userId);
    res.json(myBorrows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengambil data pinjaman', error: error.message });
  }
});

// Status Endpoint
app.get('/api/status', (req, res) => {
  const dbType = process.env.NODE_ENV === 'test' ? 'local-json' : 'mysql';
  const aiStatus = (ai || googleAI) ? 'active' : 'inactive';
  res.json({
    status: 'online',
    database: dbType,
    aiChatbot: aiStatus
  });
});

// AI Assistant untuk Deskripsi Buku
app.post('/api/ai/describe', verifyToken, async (req, res) => {
  const { bookId, message } = req.body;
  const userId = req.user.id;

  if (!bookId || !message) {
    return res.status(400).json({ message: 'ID Buku dan pesan wajib diisi' });
  }

  if (!ai) {
    return res.status(503).json({ message: 'Layanan AI sedang tidak tersedia' });
  }

  try {
    const book = await db.getBookById(bookId);
    if (!book) return res.status(404).json({ message: 'Buku tidak ditemukan' });

    // Periksa apakah user memiliki akses (sudah beli atau sedang pinjam)
    const purchases = await db.getUserBooks(userId);
    const hasPurchased = purchases.some(p => p.id === bookId);
    
    const borrows = await db.getUserBorrows(userId);
    const hasBorrowed = borrows.some(b => b.id === bookId && !b.borrowDetail.returned);

    if (!hasPurchased && !hasBorrowed) {
      return res.status(403).json({ message: 'Anda harus membeli atau meminjam buku ini terlebih dahulu untuk berdiskusi dengan AI.' });
    }

    const context = `
      Anda adalah pakar literasi untuk buku berjudul "${book.title}" karya ${book.author}.
      Deskripsi buku: ${book.description}
      Genre: ${book.genre}
      
      Tugas Anda adalah menjawab pertanyaan pengguna seputar isi, makna, atau detail buku ini secara mendalam.
    `;

    const prompt = `${context}\n\nUser: ${message}`;
    const result = await ai.models.generateContent({
        model: aiModelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const replyText = result.response ? result.response.text() : (result.text || "Maaf, saya tidak bisa merespon saat ini.");
    res.json({ reply: replyText });
  } catch (error) {
    console.error('AI Error (Describe):', error);
    res.status(500).json({ message: 'Terjadi kesalahan pada layanan AI', error: error.message });
  }
});

// Webhook untuk Dialogflow CX / ES (Integrasi Dinamis Database)
app.post('/api/dialogflow-webhook', async (req, res) => {
  console.log('[Dialogflow Webhook] Received request body:', JSON.stringify(req.body));
  try {
    const books = await db.getBooks();
    const count = books.length;
    
    // Tentukan pesan balasan
    let replyText = `Saat ini terdapat ${count} judul buku yang tersedia di E-Book Store kami.`;
    if (count > 0) {
      const bookList = books.slice(0, 5).map((b, i) => `${i+1}. ${b.title} (${b.author}) - Rp.${Number(b.price).toLocaleString('id-ID')}`).join('\n');
      replyText += `\n\nBerikut adalah beberapa koleksi teratas kami:\n${bookList}`;
    } else {
      replyText += `\n\nKatalog buku kami saat ini sedang kosong. Silakan hubungi admin untuk informasi lebih lanjut.`;
    }

    // Response format untuk Dialogflow CX
    const responseCX = {
      fulfillmentResponse: {
        messages: [
          {
            text: {
              text: [replyText]
            }
          }
        ]
      }
    };

    // Response format untuk Dialogflow ES
    const responseES = {
      fulfillmentText: replyText
    };

    // Deteksi apakah request berasal dari Dialogflow CX atau ES
    if (req.body.fulfillmentInfo || req.body.intentInfo || req.body.pageInfo) {
      console.log('[Dialogflow Webhook] Sending Dialogflow CX Response');
      res.json(responseCX);
    } else {
      console.log('[Dialogflow Webhook] Sending Dialogflow ES Response');
      res.json(responseES);
    }
  } catch (error) {
    console.error('[Dialogflow Webhook] Error:', error);
    res.status(500).json({
      fulfillmentText: "Maaf, terjadi kesalahan internal saat mengakses database buku.",
      fulfillmentResponse: {
        messages: [{ text: { text: ["Maaf, terjadi kesalahan internal saat mengakses database buku."] } }]
      }
    });
  }
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

app.server = server;

module.exports = app;