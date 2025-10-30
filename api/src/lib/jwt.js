import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
export const COOKIE_NAME = 'jwt'; // ✅ มาตรฐานหลักใช้ชื่อนี้

export function signUser(userLike) {
  // เก็บเท่าที่จำเป็น
  const payload = {
    uid: userLike.id || userLike.uid,
    role: userLike.role,
    name: userLike.name ?? null,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',   // local dev
    secure: false,     // ถ้า reverse proxy https ค่อยเปลี่ยนเป็น true
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

// ✅ เคลียร์ทั้งชื่อใหม่ (jwt) และชื่อเดิม (token)
export function clearAuthCookies(res) {
  ['jwt', 'token'].forEach((name) => {
    res.clearCookie(name, { path: '/' });
  });
}

// ✅ ดึงโทเคนจากคำขอ (รองรับทั้งชื่อใหม่/เก่า และ Authorization header)
export function getTokenFromReq(req) {
  return (
    req.cookies?.jwt ||
    req.cookies?.token ||
    (req.headers?.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null)
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
