// api/src/middlewares/ensureAuth.js
import { verifyToken } from '../lib/auth.js'; // มีอยู่แล้วจากชุดก่อนหน้า
import prisma from '../lib/prisma.js';

export const AUTH_COOKIE = 'tkn';

// ✅ รวมทุกกรณี: Passport session (connect.sid), JWT cookie tkn, Authorization Bearer
export async function ensureAuth(req, res, next) {
  try {
    // ปล่อย OPTIONS ให้ผ่าน (preflight)
    if (req.method === 'OPTIONS') return res.sendStatus(204);

    // 1) ถ้ามี user จาก Passport session
    if (req.isAuthenticated?.() && req.user?.id) return next();

    // 2) ถ้ามี jwt ในคุกกี้
    const jwtCookie = req.cookies?.[AUTH_COOKIE];
    if (jwtCookie) {
      try {
        const payload = verifyToken(jwtCookie); // { id, email, role, ... }
        if (payload?.id) {
          // อาจดึง user ตัวจริงจาก DB เพื่อความชัวร์
          const user = await prisma.user.findUnique({
            where: { id: payload.id },
            select: { id: true, email: true, name: true, role: true },
          });
          if (user) {
            req.user = user;
            return next();
          }
        }
      } catch { /* ignore */ }
    }

    // 3) Authorization: Bearer <jwt>
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      try {
        const payload = verifyToken(token);
        if (payload?.id) {
          const user = await prisma.user.findUnique({
            where: { id: payload.id },
            select: { id: true, email: true, name: true, role: true },
          });
          if (user) {
            req.user = user;
            return next();
          }
        }
      } catch { /* ignore */ }
    }

    return res.status(401).json({ error: 'unauthorized' });
  } catch (e) {
    console.error('[ensureAuth]', e);
    return res.status(401).json({ error: 'unauthorized' });
  }
}

// ✅ ตรวจสิทธิ์เข้าถึงโปรเจ็กต์ (owner / member / หรือ admin)
export function ensureProjectAccess(paramName = 'projectId') {
  return async (req, res, next) => {
    try {
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      const user = req.user;
      if (!user?.id) return res.status(401).json({ error: 'unauthorized' });

      const projectId = req.params?.[paramName];
      if (!projectId) return res.status(400).json({ error: 'projectId required' });

      // admin ผ่านได้หมด
      if (user.role === 'admin') return next();

      // owner หรือเป็นสมาชิก
      const p = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        },
        select: { id: true },
      });
      if (!p) return res.status(403).json({ error: 'forbidden' });

      return next();
    } catch (e) {
      console.error('[ensureProjectAccess]', e);
      return res.status(403).json({ error: 'forbidden' });
    }
  };
}
