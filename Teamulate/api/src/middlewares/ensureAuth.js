// api/src/middlewares/ensureAuth.js
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

export const AUTH_COOKIE = 'tkn';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/** ปล่อย OPTIONS เสมอ เพื่อให้ preflight ผ่าน */
export function ensureAuth(req, res, next) {
  if (req.method === 'OPTIONS') return res.sendStatus(204);

  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, email: payload.email, role: payload.role || 'user' };
    return next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

/** ตรวจสิทธิ์การเข้าถึงโปรเจกต์: owner, member หรือ admin */
export function ensureProjectAccess(paramKey = 'projectId') {
  return async (req, res, next) => {
    if (req.method === 'OPTIONS') return res.sendStatus(204);

    const user = req.user;
    const projectId = req.params?.[paramKey];
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    if (user.role === 'admin') return next();

    // owner?
    const owned = await prisma.project.findFirst({
      where: { id: projectId, ownerId: user.id },
      select: { id: true },
    });
    if (owned) return next();

    // member?
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId: user.id },
      select: { id: true },
    });
    if (member) return next();

    return res.status(403).json({ error: 'forbidden' });
  };
}
