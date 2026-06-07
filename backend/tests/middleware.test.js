// Set environment variable BEFORE any require
process.env.JWT_SECRET = 'test_secret_key';

const jwt = require('jsonwebtoken');
const { verifyToken, requireAdmin, JWT_SECRET } = require('../middleware/auth');

// ============================================================
// Helper: Mock Objects
// ============================================================
const mockReq = (headers = {}) => ({ headers });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ============================================================
// Helper: Token generators
// ============================================================
const TEST_SECRET = 'test_secret_key';
const WRONG_SECRET = 'wrong_secret_key';

const generateToken = (payload, options = {}) =>
  jwt.sign(payload, TEST_SECRET, options);

const generateTokenWithWrongSecret = (payload) =>
  jwt.sign(payload, WRONG_SECRET);

const generateExpiredToken = (payload) =>
  jwt.sign(payload, TEST_SECRET, { expiresIn: '-10s' });

// ============================================================
// verifyToken
// ============================================================
describe('verifyToken Middleware', () => {
  let mockNext;

  beforeEach(() => {
    mockNext = jest.fn();
  });

  // ----------------------------------------------------------
  // Happy-path tests
  // ----------------------------------------------------------
  test('harus memanggil next() ketika token valid diberikan', () => {
    const token = generateToken({ id: 1, email: 'user@test.com', role: 'user' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('harus menetapkan req.user dengan payload token yang didekode', () => {
    const payload = { id: 42, email: 'john@example.com', role: 'user' };
    const token = generateToken(payload);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(payload.id);
    expect(req.user.email).toBe(payload.email);
    expect(req.user.role).toBe(payload.role);
    // jwt.verify also adds iat (issued-at)
    expect(req.user.iat).toBeDefined();
  });

  test('harus bekerja dengan token yang berisi role user', () => {
    const payload = { id: 5, role: 'user', username: 'regularguy' };
    const token = generateToken(payload);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.user.role).toBe('user');
    expect(req.user.username).toBe('regularguy');
  });

  test('harus bekerja dengan token yang berisi role admin', () => {
    const payload = { id: 1, role: 'admin', email: 'admin@store.com' };
    const token = generateToken(payload);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.user.role).toBe('admin');
    expect(req.user.id).toBe(1);
  });

  // ----------------------------------------------------------
  // 401 – Token tidak ditemukan
  // ----------------------------------------------------------
  test('harus mengembalikan 401 ketika tidak ada authorization header', () => {
    const req = mockReq({});
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Akses ditolak: Token tidak ditemukan',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('harus mengembalikan 401 ketika authorization header adalah string kosong', () => {
    const req = mockReq({ authorization: '' });
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Akses ditolak: Token tidak ditemukan',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('harus mengembalikan 401 ketika token hilang (hanya "Bearer" tanpa token)', () => {
    // 'Bearer'.split(' ') => ['Bearer'] → index [1] is undefined
    const req = mockReq({ authorization: 'Bearer' });
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Akses ditolak: Token tidak ditemukan',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('harus gagal ketika authorization header tidak memiliki prefix "Bearer" (hanya string token)', () => {
    // Jika header = 'some_token_string' (tanpa spasi),
    // split(' ')[1] => undefined → token falsy → 401
    const token = generateToken({ id: 1, role: 'user' });
    const req = mockReq({ authorization: token }); // no "Bearer " prefix
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Akses ditolak: Token tidak ditemukan',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------
  // 403 – Token tidak valid
  // ----------------------------------------------------------
  test('harus mengembalikan 403 ketika token tidak valid / malformed', () => {
    const req = mockReq({ authorization: 'Bearer this.is.not.a.real.token' });
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Token tidak valid atau kedaluwarsa',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('harus mengembalikan 403 ketika token sudah kedaluwarsa', () => {
    const token = generateExpiredToken({ id: 1, role: 'user' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Token tidak valid atau kedaluwarsa',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('harus mengembalikan 403 ketika token ditandatangani dengan secret yang salah', () => {
    const token = generateTokenWithWrongSecret({ id: 1, role: 'user' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Token tidak valid atau kedaluwarsa',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------
  // Edge-case tambahan
  // ----------------------------------------------------------
  test('harus mengembalikan 401 ketika header "Bearer " diikuti spasi kosong', () => {
    // 'Bearer '.split(' ') => ['Bearer', ''] → index [1] is '' (falsy)
    const req = mockReq({ authorization: 'Bearer ' });
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Akses ditolak: Token tidak ditemukan',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('tidak boleh memodifikasi req.user ketika token tidak valid', () => {
    const req = mockReq({ authorization: 'Bearer invalid_token' });
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(req.user).toBeUndefined();
  });

  test('harus menyertakan iat dalam payload yang didekode', () => {
    const token = generateToken({ id: 99 });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    verifyToken(req, res, mockNext);

    expect(req.user.iat).toEqual(expect.any(Number));
  });
});

// ============================================================
// requireAdmin
// ============================================================
describe('requireAdmin Middleware', () => {
  let mockNext;

  beforeEach(() => {
    mockNext = jest.fn();
  });

  // ----------------------------------------------------------
  // Happy-path: admin berhasil
  // ----------------------------------------------------------
  test('harus memanggil next() ketika token admin valid diberikan', () => {
    const token = generateToken({ id: 1, role: 'admin' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    requireAdmin(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('harus bekerja dengan payload admin lengkap', () => {
    const payload = {
      id: 1,
      email: 'admin@ebookstore.com',
      role: 'admin',
      username: 'superadmin',
    };
    const token = generateToken(payload);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    requireAdmin(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(req.user.id).toBe(payload.id);
    expect(req.user.email).toBe(payload.email);
    expect(req.user.role).toBe('admin');
    expect(req.user.username).toBe(payload.username);
  });

  // ----------------------------------------------------------
  // 403 – Bukan admin
  // ----------------------------------------------------------
  test('harus mengembalikan 403 ketika user memiliki role "user" (bukan admin)', () => {
    const token = generateToken({ id: 2, role: 'user' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    requireAdmin(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Akses ditolak: Hanya Admin yang dapat melakukan tindakan ini',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('harus menolak role "moderator" (memeriksa field role secara spesifik)', () => {
    const token = generateToken({ id: 3, role: 'moderator' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    requireAdmin(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Akses ditolak: Hanya Admin yang dapat melakukan tindakan ini',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('tidak boleh memanggil next() ketika role bukan admin', () => {
    const token = generateToken({ id: 10, role: 'editor' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    requireAdmin(req, res, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
  });

  // ----------------------------------------------------------
  // Delegasi ke verifyToken (401 / 403 dari verifyToken)
  // ----------------------------------------------------------
  test('harus mengembalikan 401 ketika tidak ada token yang diberikan', () => {
    const req = mockReq({});
    const res = mockRes();

    requireAdmin(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Akses ditolak: Token tidak ditemukan',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('harus mengembalikan 403 ketika token tidak valid', () => {
    const req = mockReq({ authorization: 'Bearer invalid_garbage_token' });
    const res = mockRes();

    requireAdmin(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Token tidak valid atau kedaluwarsa',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('harus mengembalikan 403 ketika token sudah kedaluwarsa', () => {
    const token = generateExpiredToken({ id: 1, role: 'admin' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    requireAdmin(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Token tidak valid atau kedaluwarsa',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('harus mengembalikan 403 ketika token ditandatangani dengan secret yang salah walaupun role admin', () => {
    const token = generateTokenWithWrongSecret({ id: 1, role: 'admin' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();

    requireAdmin(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Token tidak valid atau kedaluwarsa',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});

// ============================================================
// JWT_SECRET export
// ============================================================
describe('JWT_SECRET Export', () => {
  test('harus mengekspor JWT_SECRET yang sesuai dengan environment variable', () => {
    expect(JWT_SECRET).toBe('test_secret_key');
  });
});
