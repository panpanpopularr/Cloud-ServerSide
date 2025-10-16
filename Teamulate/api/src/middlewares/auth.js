import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

export function attachUser(req, _res, next) {
  try {
    // รองรับทั้ง Bearer, cookie 'jwt' และ 'token'
    const fromAuth   = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
    const fromCookie = req.cookies?.jwt || req.cookies?.token;
    const tok = fromAuth || fromCookie;
    if (!tok) return next();

    const p = jwt.verify(tok, JWT_SECRET);
    // รองรับ payload หลายรูปแบบ
    const id    = p.uid || p.id || p.user?.id;
    const role  = p.role || p.user?.role;
    const name  = p.name || p.user?.name;
    const email = p.email || p.user?.email;

    if (id) req.user = { id, role, name, email };
  } catch {
    // เงียบไว้ก็พอ
  }
  next();
}

export function ensureAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  next();
}

export function ensureAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  if ((req.user.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
}
