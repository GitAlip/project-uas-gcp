const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ebookstore_super_secret_key_123';

// Middleware untuk memverifikasi token JWT umum
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"
  
  if (!token) {
    return res.status(401).json({ message: 'Akses ditolak: Token tidak ditemukan' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Token tidak valid atau kedaluwarsa' });
  }
}

// Middleware untuk memverifikasi hak akses khusus Admin
function requireAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Akses ditolak: Hanya Admin yang dapat melakukan tindakan ini' });
    }
    next();
  });
}

module.exports = {
  verifyToken,
  requireAdmin,
  JWT_SECRET
};
