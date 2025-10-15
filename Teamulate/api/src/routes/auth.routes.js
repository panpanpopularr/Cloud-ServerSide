import { Router } from 'express';
import cookie from 'cookie';
import prisma from '../lib/prisma.js';
import { UserModel } from '../models/user.model.js';
import { signUser, ensureAuth } from '../middlewares/auth.js';

const router = Router();

// REGISTER (local)
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
      role: 'USER',
    });

    const token = signUser(u);
    res.setHeader(
      'Set-Cookie',
      cookie.serialize('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    );

    res.json({ user: u });
  } catch (e) {
    console.error('[register]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// LOGIN (local)
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const u = await UserModel.verifyLocal(email, password);
    if (!u) return res.status(401).json({ error: 'invalid_credentials' });

    const token = signUser(u);
    res.setHeader(
      'Set-Cookie',
      cookie.serialize('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    );

    res.json({ user: u });
  } catch (e) {
    console.error('[login]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// LOGOUT
router.post('/auth/logout', (_req, res) => {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize('token', '', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  );
  res.json({ ok: true });
});

// ME (ดูข้อมูลตัวเอง)
router.get('/auth/me', ensureAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.uid },
      select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'not_found' });
    res.json({ user });
  } catch (e) {
    console.error('[auth/me]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
