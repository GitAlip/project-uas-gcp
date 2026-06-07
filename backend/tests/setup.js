/**
 * Jest Test Setup File
 * ====================
 * Setup environment variables, test data directories, and helper functions
 * for E-Book Store backend testing.
 */

// Set environment variables BEFORE requiring any modules
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Path for isolated test data
const TEST_DATA_DIR = path.join(__dirname, 'test_data');

// ============================================================
// Global Setup & Teardown
// ============================================================

beforeAll(() => {
  // Create the test_data directory if it doesn't exist
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
});

afterAll(() => {
  // Clean up the test_data directory after each test suite
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
});

// ============================================================
// Helper Functions
// ============================================================

/**
 * Generate a valid JWT token for testing.
 * @param {Object} payload - The payload to encode in the token (e.g. { id, username, role })
 * @param {Object} [options] - Optional jwt.sign options (e.g. { expiresIn: '1h' })
 * @returns {string} A signed JWT token string
 */
function generateTestToken(payload, options = {}) {
  const defaultOptions = { expiresIn: '1h' };
  return jwt.sign(payload, process.env.JWT_SECRET, { ...defaultOptions, ...options });
}

/**
 * Create test user data object (does NOT persist to any database).
 * Returns a plain user object with a hashed password, ready to be
 * inserted into a test data store or used for assertions.
 *
 * @param {string} username - The username for the test user
 * @param {string} password - The plain-text password (will be hashed)
 * @param {string} [role='user'] - The role of the user ('user' or 'admin')
 * @returns {Object} User data object with id, username, hashedPassword, role, and createdAt
 */
function createTestUser(username = 'testuser', password = 'testpassword123', role = 'user') {
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  return {
    id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    username,
    password: hashedPassword,
    role,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get the path to the test data directory.
 * @returns {string} Absolute path to test_data/
 */
function getTestDataDir() {
  return TEST_DATA_DIR;
}

/**
 * Write a JSON file into the test data directory.
 * Useful for seeding test data files that the app reads from.
 *
 * @param {string} filename - Name of the JSON file (e.g. 'users.json')
 * @param {*} data - Data to serialize to JSON
 */
function writeTestDataFile(filename, data) {
  const filePath = path.join(TEST_DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Read a JSON file from the test data directory.
 *
 * @param {string} filename - Name of the JSON file to read
 * @returns {*} Parsed JSON data, or null if the file doesn't exist
 */
function readTestDataFile(filename) {
  const filePath = path.join(TEST_DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  generateTestToken,
  createTestUser,
  getTestDataDir,
  writeTestDataFile,
  readTestDataFile,
  TEST_DATA_DIR,
};
