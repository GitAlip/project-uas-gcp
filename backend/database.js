const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATA_DIR = path.join(__dirname, 'data');
const BOOKS_FILE = path.join(DATA_DIR, 'books.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
const BORROWS_FILE = path.join(DATA_DIR, 'borrows.json');

const readJSON = (file) => {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
};

const writeJSON = (file, data) => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
};

const dbConfig = {
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ebookstore_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableCleartextPlugin: true
};

let pool = null;
if (process.env.NODE_ENV !== 'test') {
  // Deteksi koneksi Cloud SQL via Unix Sockets di Cloud Run
  if (process.env.INSTANCE_CONNECTION_NAME) {
    dbConfig.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    console.log(`[Database] Terhubung ke Cloud SQL via socket: /cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`);
  } else {
    dbConfig.host = process.env.DB_HOST || 'localhost';
    dbConfig.port = process.env.DB_PORT || 3306;
    console.log(`[Database] Terhubung secara lokal via TCP: ${dbConfig.host}:${dbConfig.port}`);
  }
  pool = mysql.createPool(dbConfig);
}

// --- TEST MODE (SYNCHRONOUS JSON DATABASE) ---
const db_test = {
  getBooks: () => {
    return readJSON(BOOKS_FILE);
  },
  
  getBookById: (id) => {
    const books = readJSON(BOOKS_FILE);
    return books.find(b => b.id === id);
  },
  
  addBook: (bookData) => {
    const books = readJSON(BOOKS_FILE);
    const id = Date.now().toString();
    const newBook = { 
      id, 
      ...bookData, 
      price: bookData.price !== undefined ? Number(bookData.price) : undefined,
      originalPrice: bookData.originalPrice !== undefined ? Number(bookData.originalPrice) : (bookData.price !== undefined ? Number(bookData.price) : undefined),
      stock: bookData.stock !== undefined ? Number(bookData.stock) : undefined
    };
    books.push(newBook);
    writeJSON(BOOKS_FILE, books);
    return newBook;
  },
  
  updateBook: (id, bookData) => {
    const books = readJSON(BOOKS_FILE);
    const index = books.findIndex(b => b.id === id);
    if (index === -1) return null;
    
    const updatedData = { ...bookData };
    if (updatedData.price !== undefined) updatedData.price = Number(updatedData.price);
    if (updatedData.originalPrice !== undefined) updatedData.originalPrice = Number(updatedData.originalPrice);
    if (updatedData.stock !== undefined) updatedData.stock = Number(updatedData.stock);
    
    books[index] = { ...books[index], ...updatedData };
    writeJSON(BOOKS_FILE, books);
    return books[index];
  },
  
  deleteBook: (id) => {
    const books = readJSON(BOOKS_FILE);
    const filtered = books.filter(b => b.id !== id);
    if (books.length === filtered.length) return false;
    writeJSON(BOOKS_FILE, filtered);
    
    const purchases = readJSON(PURCHASES_FILE).filter(p => p.bookId !== id);
    writeJSON(PURCHASES_FILE, purchases);
    const borrows = readJSON(BORROWS_FILE).filter(b => b.bookId !== id);
    writeJSON(BORROWS_FILE, borrows);
    return true;
  },

  getUsers: () => {
    const users = readJSON(USERS_FILE);
    return users; // Include passwords in tests
  },
  
  getUserByUsername: (username) => {
    if (!username) return undefined;
    const users = readJSON(USERS_FILE);
    return users.find(u => u.username.toLowerCase() === username.toLowerCase());
  },
  
  addUser: (userData) => {
    const users = readJSON(USERS_FILE);
    const id = 'u' + Date.now().toString();
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(userData.password, salt);
    const role = userData.role || 'user';
    const newUser = { id, username: userData.username, password: hashedPassword, role };
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    return { id, username: userData.username, role };
  },

  addPurchase: (userId, bookId, amountPaid) => {
    const purchases = readJSON(PURCHASES_FILE);
    const existing = purchases.find(p => p.userId === userId && p.bookId === bookId);
    if (existing) return existing;

    const books = readJSON(BOOKS_FILE);
    const bookIndex = books.findIndex(b => b.id === bookId);
    if (bookIndex === -1 || books[bookIndex].stock <= 0) {
      throw new Error('Stok buku habis');
    }
    books[bookIndex].stock -= 1;
    writeJSON(BOOKS_FILE, books);

    const id = 'p' + Date.now().toString();
    const purchaseDate = new Date().toISOString();
    const newPurchase = { id, userId, bookId, purchaseDate, amountPaid: amountPaid !== undefined ? Number(amountPaid) : undefined };
    purchases.push(newPurchase);
    writeJSON(PURCHASES_FILE, purchases);
    return newPurchase;
  },

  getUserBooks: (userId) => {
    const purchases = readJSON(PURCHASES_FILE).filter(p => p.userId === userId);
    const books = readJSON(BOOKS_FILE);
    return purchases.map(p => {
      const book = books.find(b => b.id === p.bookId);
      if (!book) return null;
      return { ...book, purchaseDate: p.purchaseDate };
    }).filter(b => b !== null);
  },

  getBorrows: () => {
    return readJSON(BORROWS_FILE);
  },

  addBorrow: (userId, bookId, durationMinutes) => {
    const books = readJSON(BOOKS_FILE);
    const bookIndex = books.findIndex(b => b.id === bookId);
    if (bookIndex === -1) return null;
    if (books[bookIndex].stock <= 0) return { error: 'Stok buku habis' };

    const borrows = readJSON(BORROWS_FILE);
    const now = new Date();
    const activeBorrow = borrows.find(b => b.userId === userId && b.bookId === bookId && !b.returned && new Date(b.expiryDate) > now);
    if (activeBorrow) {
      return activeBorrow;
    }

    books[bookIndex].stock -= 1;
    writeJSON(BOOKS_FILE, books);

    const id = 'br' + Date.now().toString();
    const borrowDate = new Date();
    const expiryDate = new Date(borrowDate.getTime() + Number(durationMinutes) * 60 * 1000);
    const newBorrow = {
      id,
      userId,
      bookId,
      borrowDate: borrowDate.toISOString(),
      durationMinutes: durationMinutes !== undefined ? Number(durationMinutes) : undefined,
      expiryDate: expiryDate.toISOString(),
      returned: false
    };
    borrows.push(newBorrow);
    writeJSON(BORROWS_FILE, borrows);
    return newBorrow;
  },

  getUserBorrows: (userId) => {
    const borrows = readJSON(BORROWS_FILE);
    const now = new Date();
    let changed = false;

    borrows.forEach(b => {
      if (b.userId === userId && !b.returned && new Date(b.expiryDate) < now) {
        b.returned = true;
        changed = true;
        const books = readJSON(BOOKS_FILE);
        const bookIndex = books.findIndex(bk => bk.id === b.bookId);
        if (bookIndex !== -1) {
          books[bookIndex].stock += 1;
          writeJSON(BOOKS_FILE, books);
        }
      }
    });
    if (changed) writeJSON(BORROWS_FILE, borrows);

    const userBorrows = borrows.filter(b => b.userId === userId);
    const books = readJSON(BOOKS_FILE);
    return userBorrows.map(b => {
      const book = books.find(bk => bk.id === b.bookId);
      if (!book) return null;
      return {
        ...book,
        borrowDetail: {
          id: b.id,
          userId: b.userId,
          bookId: b.bookId,
          borrowDate: b.borrowDate,
          expiryDate: b.expiryDate,
          returned: b.returned,
          durationMinutes: b.durationMinutes
        }
      };
    }).filter(b => b !== null);
  }
};

// --- PRODUCTION/DEV MODE (ASYNCHRONOUS MYSQL DATABASE) ---
const db_production = {
  getBooks: async () => {
    const [rows] = await pool.query('SELECT * FROM books');
    return rows;
  },
  
  getBookById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [id]);
    return rows[0] || null;
  },
  
  addBook: async (bookData) => {
    const id = Date.now().toString();
    const { title, author, genre, price, originalPrice, stock, description, imageUrl } = bookData;
    await pool.query(
      'INSERT INTO books (id, title, author, genre, price, originalPrice, stock, description, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, author, genre, price, originalPrice || price, stock, description, imageUrl]
    );
    return { id, ...bookData };
  },
  
  updateBook: async (id, bookData) => {
    const fields = Object.keys(bookData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(bookData);
    if (fields.length === 0) return null;
    
    await pool.query(`UPDATE books SET ${fields} WHERE id = ?`, [...values, id]);
    return db_production.getBookById(id);
  },
  
  deleteBook: async (id) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Hapus data terkait di tabel borrows dan purchases terlebih dahulu
      await connection.query('DELETE FROM borrows WHERE bookId = ?', [id]);
      await connection.query('DELETE FROM purchases WHERE bookId = ?', [id]);
      
      // Hapus buku
      const [result] = await connection.query('DELETE FROM books WHERE id = ?', [id]);
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  getUsers: async () => {
    const [rows] = await pool.query('SELECT id, username, role FROM users');
    return rows;
  },
  
  getUserByUsername: async (username) => {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0] || null;
  },
  
  addUser: async (userData) => {
    const id = 'u' + Date.now().toString();
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(userData.password, salt);
    const role = userData.role || 'user';
    
    await pool.query(
      'INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)',
      [id, userData.username, hashedPassword, role]
    );
    return { id, username: userData.username, role };
  },

  addPurchase: async (userId, bookId, amountPaid) => {
    const [existing] = await pool.query('SELECT * FROM purchases WHERE userId = ? AND bookId = ?', [userId, bookId]);
    if (existing.length > 0) return existing[0];

    const id = 'p' + Date.now().toString();
    const purchaseDate = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL format

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.query(
        'INSERT INTO purchases (id, userId, bookId, purchaseDate, amountPaid) VALUES (?, ?, ?, ?, ?)',
        [id, userId, bookId, purchaseDate, amountPaid]
      );
      
      await connection.query('UPDATE books SET stock = stock - 1 WHERE id = ? AND stock > 0', [bookId]);
      
      await connection.commit();
      return { id, userId, bookId, purchaseDate, amountPaid };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  getUserBooks: async (userId) => {
    const [rows] = await pool.query(`
      SELECT b.*, p.purchaseDate 
      FROM books b
      JOIN purchases p ON b.id = p.bookId
      WHERE p.userId = ?
    `, [userId]);
    return rows;
  },

  getBorrows: async () => {
    const [rows] = await pool.query('SELECT * FROM borrows');
    return rows;
  },

  addBorrow: async (userId, bookId, durationMinutes) => {
    const [book] = await pool.query('SELECT stock FROM books WHERE id = ?', [bookId]);
    if (!book[0]) return null;
    if (book[0].stock <= 0) return { error: 'Stok buku habis' };

    const id = 'br' + Date.now().toString();
    const borrowDate = new Date();
    const expiryDate = new Date(borrowDate.getTime() + Number(durationMinutes) * 60 * 1000);
    
    const borrowDateStr = borrowDate.toISOString().slice(0, 19).replace('T', ' ');
    const expiryDateStr = expiryDate.toISOString().slice(0, 19).replace('T', ' ');

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.query(
        'INSERT INTO borrows (id, userId, bookId, borrowDate, durationMinutes, expiryDate, returned) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, userId, bookId, borrowDateStr, durationMinutes, expiryDateStr, false]
      );
      
      await connection.query('UPDATE books SET stock = stock - 1 WHERE id = ? AND stock > 0', [bookId]);
      
      await connection.commit();
      return { id, userId, bookId, borrowDate: borrowDateStr, expiryDate: expiryDateStr, returned: false };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  getUserBorrows: async (userId) => {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const [expired] = await pool.query(
      'SELECT id, bookId FROM borrows WHERE userId = ? AND returned = 0 AND expiryDate < ?', 
      [userId, nowStr]
    );
    
    if (expired.length > 0) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        for (const b of expired) {
          await connection.query('UPDATE borrows SET returned = 1 WHERE id = ?', [b.id]);
          await connection.query('UPDATE books SET stock = stock + 1 WHERE id = ?', [b.bookId]);
        }
        await connection.commit();
      } catch (err) {
        await connection.rollback();
        console.error('Error auto-returning books:', err);
      } finally {
        connection.release();
      }
    }

    const [rows] = await pool.query(`
      SELECT b.*, br.id as borrowId, br.borrowDate, br.expiryDate, br.returned, br.durationMinutes
      FROM books b
      JOIN borrows br ON b.id = br.bookId
      WHERE br.userId = ?
    `, [userId]);
    
    return rows.map(r => ({
      ...r,
      borrowDetail: {
        id: r.borrowId,
        borrowDate: r.borrowDate,
        expiryDate: r.expiryDate,
        returned: !!r.returned,
        durationMinutes: r.durationMinutes
      }
    }));
  }
};

module.exports = (process.env.NODE_ENV === 'test') ? db_test : db_production;
