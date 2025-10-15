// api/src/routes/auth.routes.js
import { Router } from 'express';
import cookie from 'cookie';
import passport from 'passport';
import prisma from '../lib/prisma.js';
import { UserModel } from '../models/user.model.js';
import { signUser, ensureAuth } from '../middlewares/auth.js';

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const IS_CROSS_SITE =
  process.env.CROSS_SITE === '1' ||
  (FRONTEND.startsWith('https://') && !FRONTEND.includes('localhost'));

const router = Router();

// helper สำหรับตั้ง cookie ให้ถูกเมื่อ cross-site
function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: IS_CROSS_SITE ? 'none' : 'lax',
    secure: IS_CROSS_SITE,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };
}

// ===== Register =====
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name?.trim() || !email?.trim() || !password?.trim())
      return res.status(400).json({ error: 'bad_request' });

    const exist = await UserModel.findByEmail(email);
    if (exist) return res.status(409).json({ error: 'email_taken' });

    const u = await UserModel.createLocal({
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
      role: 'user',
    });

    const token = signUser(u);
    res.setHeader('Set-Cookie', cookie.serialize('token', token, cookieOpts()));
    res.json({ user: u });
  } catch (e) {
    console.error('[register]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ===== Login =====
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const u = await UserModel.verifyLocal(email, password);
    if (!u) return res.status(401).json({ error: 'invalid_credentials' });

    const token = signUser(u);
    res.setHeader('Set-Cookie', cookie.serialize('token', token, cookieOpts()));
    res.json({ user: u });
  } catch (e) {
    console.error('[login]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ===== Logout =====
router.post('/auth/logout', (_req, res) => {
  res.setHeader('Set-Cookie', cookie.serialize('token', '', { ...cookieOpts(), maxAge: 0 }));
  res.json({ ok: true });
});

// ===== Me (อ่านจาก DB สด ๆ ทุกครั้ง เพื่อให้ชื่อที่แก้ในโปรไฟล์อัปเดตทันที) =====
router.get('/auth/me', ensureAuth, async (req, res) => {
  try {
    const uid = req.user?.uid || req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return res.status(404).json({ error: 'not_found' });
    res.json({ user });
  } catch (e) {
    console.error('[auth/me]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ===== Google OAuth =====
router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${FRONTEND}/login?error=google`,
  }),
  (req, res) => {
    const token = signUser(req.user);
    res.setHeader('Set-Cookie', cookie.serialize('token', token, cookieOpts()));
    res.redirect(FRONTEND);
  }
);

export default router;
