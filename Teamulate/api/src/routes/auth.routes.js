import { Router } from 'express';
import passport from '../lib/passport.js';
import { UserModel } from '../models/user.model.js';

const router = Router();

// ===== Local Register =====
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    const exist = await UserModel.findByEmail(email);
    if (exist) return res.status(409).json({ error: 'email already used' });

    const u = await UserModel.createLocal({ name, email, password });
    req.login(u, (err) => {
      if (err) return res.status(500).json({ error: 'login after register failed' });
      res.json({ user: { id: u.id, email: u.email, name: u.name, avatar: u.avatar ?? null } });
    });
  } catch (e) {
    console.error('[register]', e);
    res.status(500).json({ error: 'register failed' });
  }
});

// ===== Local Login =====
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    const u = await UserModel.verifyLocal({ email, password });
    if (!u) return res.status(401).json({ error: 'invalid credential' });

    req.login(u, (err) => {
      if (err) return res.status(500).json({ error: 'login failed' });
      res.json({ user: { id: u.id, email: u.email, name: u.name, avatar: u.avatar ?? null } });
    });
  } catch (e) {
    console.error('[login]', e);
    res.status(500).json({ error: 'login failed' });
  }
});

// ===== Logout =====
router.post('/auth/logout', (req, res) => {
  req.logout(() => {
    req.session?.destroy?.(() => {});
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// ===== Me =====
router.get('/auth/me', (req, res) => {
  if (!req.user) return res.status(401).json({ user: null });
  const u = req.user;
  res.json({ user: { id: u.id, email: u.email, name: u.name, avatar: u.avatar ?? null } });
});

// ===== Google OAuth =====
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=oauth`,
    session: true,
  }),
  (req, res) => {
    // สำเร็จแล้ว redirect กลับเว็บ
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/workspace`);
  }
);

export default router;
