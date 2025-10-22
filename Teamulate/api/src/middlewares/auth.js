// api/src/middlewares/auth.js
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

export function attachUser(req, _res, next) {
  try {
    const fromAuth = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
    const fromCookie = req.cookies?.jwt || req.cookies?.token;
    const tok = fromAuth || fromCookie;
    if (tok) {
      const p = jwt.verify(tok, JWT_SECRET);
      // ✅ เก็บเฉพาะ id/uid ไว้พอ ที่เหลือไปอ่านจาก DB ใน /auth/me
      const id = p.uid || p.id || p.user?.id;
      if (id) req.user = { id };
    }
  } catch { /* ignore */ }
  next();
}

export function ensureAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  next();
}

export function ensureAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  // /auth/me จะเป็นตัวที่บอก role ล่าสุด ถ้าจำเป็นค่อยดึง DB ตรวจในจุดนี้อีกชั้น
  next();
}
