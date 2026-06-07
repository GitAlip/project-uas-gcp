const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DATA_DIR = path.join(__dirname, 'data');
const BOOKS_FILE = path.join(DATA_DIR, 'books.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PURCHASES_FILE = path.join(DATA_DIR, 'purchases.json');
const BORROWS_FILE = path.join(DATA_DIR, 'borrows.json');

async function migrate() {
  console.log('--- Starting Migration: JSON to MySQL ---');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    const dbName = process.env.DB_NAME || 'ebookstore_db';
    
    // 1. Create Database
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    await connection.query(`USE ${dbName}`);
    console.log(`Database "${dbName}" checked/created.`);

    // 2. Create Tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS books (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255),
        genre VARCHAR(100),
        price INT,
        originalPrice INT,
        stock INT,
        description TEXT,
        imageUrl TEXT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user'
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id VARCHAR(50) PRIMARY KEY,
        userId VARCHAR(50),
        bookId VARCHAR(50),
        purchaseDate DATETIME,
        amountPaid INT,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (bookId) REFERENCES books(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS borrows (
        id VARCHAR(50) PRIMARY KEY,
        userId VARCHAR(50),
        bookId VARCHAR(50),
        borrowDate DATETIME,
        durationMinutes INT,
        expiryDate DATETIME,
        returned BOOLEAN DEFAULT 0,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (bookId) REFERENCES books(id)
      )
    `);
    console.log('Tables checked/created.');

    // 3. Migrate Data
    const migrateData = async (file, table, columns) => {
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        if (data.length > 0) {
          console.log(`Migrating ${data.length} records to "${table}"...`);
          for (const item of data) {
            const keys = Object.keys(item).filter(k => columns.includes(k));
            const values = keys.map(k => {
              if (k.toLowerCase().includes('date')) {
                return item[k].slice(0, 19).replace('T', ' ');
              }
              return item[k];
            });
            const placeholders = keys.map(() => '?').join(', ');
            
            try {
              await connection.query(
                `INSERT IGNORE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
                values
              );
            } catch (err) {
              console.error(`Error inserting into ${table}:`, err.message);
            }
          }
        }
      }
    };

    await migrateData(BOOKS_FILE, 'books', ['id', 'title', 'author', 'genre', 'price', 'originalPrice', 'stock', 'description', 'imageUrl']);
    await migrateData(USERS_FILE, 'users', ['id', 'username', 'password', 'role']);
    await migrateData(PURCHASES_FILE, 'purchases', ['id', 'userId', 'bookId', 'purchaseDate', 'amountPaid']);
    await migrateData(BORROWS_FILE, 'borrows', ['id', 'userId', 'bookId', 'borrowDate', 'durationMinutes', 'expiryDate', 'returned']);

    console.log('--- Migration Completed Successfully ---');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
