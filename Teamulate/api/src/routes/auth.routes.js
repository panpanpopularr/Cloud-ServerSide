// api/src/routes/auth.routes.js
import { Router } from 'express';
import cookie from 'cookie';
import prisma from '../lib/prisma.js';
import { UserModel } from '../models/user.model.js';
import { signUser, ensureAuth, AUTH_COOKIE, attachUser } from '../middlewares/auth.js';

const router = Router();

/** ---------- REGISTER (local) ---------- */
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ error: 'bad_request' });
    }

    const exist = await UserModel.findByEmail(email);
    if (exist) return res.status(409).json({ error: 'email_taken' });

    const u = await UserModel.createLocal({
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
      role: 'user',
    });

    const token = signUser(u);
    res.setHeader(
      'Set-Cookie',
      cookie.serialize(AUTH_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    );

    res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role } });
  } catch (e) {
    console.error('[register]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/** ---------- LOGIN (local) ---------- */
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const u = await UserModel.verifyLocal(email, password);
    if (!u) return res.status(401).json({ error: 'invalid_credentials' });

    const token = signUser(u);
    res.setHeader(
      'Set-Cookie',
      cookie.serialize(AUTH_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    );

    res.json({ user: { id: u.id, name: u.name, email: u.email, role: u.role } });
  } catch (e) {
    console.error('[login]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/** ---------- LOGOUT ---------- */
/* ให้ compat ทั้ง /auth/logout (POST) และ /logout (GET) */
function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(AUTH_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  );
}
router.post('/auth/logout', (req, res) => {
  clearAuthCookie(res);
  try { req.logout?.(); } catch {}
  res.json({ ok: true });
});
router.get('/logout', (req, res) => {
  clearAuthCookie(res);
  try { req.logout?.(); } catch {}
  res.json({ ok: true });
});

/** ---------- ME (ดูข้อมูลตัวเอง) ---------- */
/* ให้ compat ทั้ง /auth/me และ /me */
async function handleMe(req, res) {
  try {
    // รองรับทั้ง passport (req.user.id) และ JWT (req.user.id หรือ req.user.uid)
    const userId = req.user?.id || req.user?.uid;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'not_found' });
    res.json(user); // <- ตอบตรง ๆ ให้ frontend ใช้ง่าย: {id,name,...}
  } catch (e) {
    console.error('[me]', e);
    res.status(500).json({ error: 'server_error' });
  }
}
router.get('/auth/me', attachUser, ensureAuth, handleMe);
router.get('/me', attachUser, ensureAuth, handleMe);

export default router;
