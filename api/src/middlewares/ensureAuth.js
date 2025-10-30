// api/src/middlewares/ensureAuth.js
import cookie from 'cookie';
import prisma from '../lib/prisma.js';
import { AUTH_COOKIE, verifyToken } from '../lib/jwt.js';

export async function ensureAuth(req, res, next) {
  try {
    if (req.method === 'OPTIONS') return res.sendStatus(204);

    // 1) ถ้ามี user จาก session ของ Passport
    if (req.isAuthenticated?.() && req.user?.id) return next();

    // 2) JWT ใน cookie
    const parsed = cookie.parse(req.headers.cookie || '');
    const tok = parsed[AUTH_COOKIE];
    if (tok) {
      try {
        const payload = verifyToken(tok);
        if (payload?.id) {
          const user = await prisma.user.findUnique({
            where: { id: payload.id },
            select: { id: true, email: true, name: true, role: true },
          });
          if (user) { req.user = user; return next(); }
        }
      } catch {}
    }

    // 3) Bearer
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      const t = auth.slice(7);
      try {
        const payload = verifyToken(t);
        if (payload?.id) {
          const user = await prisma.user.findUnique({
            where: { id: payload.id },
            select: { id: true, email: true, name: true, role: true },
          });
          if (user) { req.user = user; return next(); }
        }
      } catch {}
    }

    return res.status(401).json({ error: 'unauthorized' });
  } catch (e) {
    console.error('[ensureAuth]', e);
    return res.status(401).json({ error: 'unauthorized' });
  }
}
