// api/src/middlewares/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev';

export function signUser(u) {
  const payload = { uid: u.id, role: u.role || 'USER', email: u.email || null };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function ensureAuth(req, res, next) {
  try {
    const token = parseToken(req);
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized' });
  }
}

export function ensureAdmin(req, res, next) {
  ensureAuth(req, res, () => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'forbidden' });
    next();
  });
}

function parseToken(req) {
  const raw = req.headers.cookie || '';
  const c = Object.fromEntries(
    raw.split(';').map(s => s.trim()).filter(Boolean).map(s => s.split('=').map(decodeURIComponent))
  );
  return c.token;
}
