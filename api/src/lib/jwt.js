// api/src/lib/jwt.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/,'');
const API_URL = (process.env.API_URL || `http://localhost:${process.env.PORT||4000}`).replace(/\/+$/,'');
const USE_HTTPS =
  API_URL.startsWith('https://') || FRONTEND_URL.startsWith('https://');

const cookieBase = {
  httpOnly: true,
  secure: USE_HTTPS,
  sameSite: USE_HTTPS ? 'none' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
};

const isCrossSite = (() => {
  try {
    const fe = new URL(FRONTEND_URL);
    const api = new URL(API_URL);
    return fe.origin !== api.origin;
  } catch { return true; }
})();

export function signUser(user, opts = {}) {
  const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d', ...opts });
}

export function setAuthCookie(res, token) {
  res.cookie('jwt', token, cookieBase);
}

export function clearAuthCookie(res) {
  res.clearCookie('jwt', { ...cookieBase, maxAge: 0 });
}
