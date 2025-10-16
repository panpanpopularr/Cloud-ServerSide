// api/src/lib/jwt.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const CROSS_SITE = (process.env.CROSS_SITE || '0') === '1';

export function signUser(user) {
  // เก็บ field ที่จำเป็น
  const payload = { id: user.id, email: user.email, role: user.role || 'user', name: user.name || null };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function setAuthCookie(res, token) {
  res.cookie('jwt', token, {
    httpOnly: true,
    sameSite: CROSS_SITE ? 'none' : 'lax',
    secure: CROSS_SITE,          // local = false
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: '/',
  });
}
