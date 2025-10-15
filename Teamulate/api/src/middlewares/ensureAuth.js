// api/src/middlewares/auth.js
import jwt from 'jsonwebtoken';

export const AUTH_COOKIE = 'token';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = '7d';

export function signUser(user) {
  const payload = {
    uid: user.id,
    role: (user.role || 'user').toLowerCase(),
    name: user.name || null,
    email: user.email || null,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyUserToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/** ดึง user จาก cookie JWT ถ้ายังไม่มีบน req (ใช้ภายในไฟล์นี้) */
function hydrateUserFromCookie(req) {
  if (req.user && req.user.id) return true;
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return false;
  try {
    const payload = verifyUserToken(token); // { uid, role, ... }
    req.user = { id: payload.uid, ...payload };
    return true;
  } catch {
    return false;
  }
}

/** แนบ user ถ้ามี (ไม่บังคับให้ล็อกอิน) */
export function attachUser(req, _res, next) {
  if (req.user && req.user.id) return next();     // passport session
  hydrateUserFromCookie(req);                     // เฉย ๆ ไม่ error
  next();
}

/** ต้องล็อกอินเท่านั้น */
export function ensureAuth(req, res, next) {
  if (req.user && req.user.id) return next();     // passport session ok
  if (!hydrateUserFromCookie(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

/** ต้องเป็นแอดมิน (role === 'admin') */
export function ensureAdmin(req, res, next) {
  // ให้ผ่านได้ทั้งกรณีใช้ ensureAuth มาก่อน หรือยังไม่ได้แนบ user
  if (!(req.user && req.user.id)) {
    if (!hydrateUserFromCookie(req)) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }
  const role = (req.user?.role || '').toString().toLowerCase();
  if (role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
}
