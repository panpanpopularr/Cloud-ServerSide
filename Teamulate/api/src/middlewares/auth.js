// api/src/middlewares/auth.js
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';

/**
 * attachUser
 * - ใช้แนบ req.user จาก JWT ใน cookie (jwt)
 */
export function attachUser(req, _res, next) {
  const token =
    req.cookies?.jwt ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // token ไม่ถูกต้อง → ปล่อยเป็น guest
    }
  }
  next();
}

/**
 * ensureAuth
 * - ใช้ใน route ที่ต้อง login ก่อนเท่านั้น
 */
export function ensureAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

/**
 * ensureAdmin
 * - ใช้ใน route ที่เฉพาะ admin เข้าถึงได้
 */
export function ensureAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
}
