// api/src/routes/auth.routes.js
import { Router } from 'express';
import cookie from 'cookie';
import passport from 'passport';
import { UserModel } from '../models/user.model.js';
import { signUser, ensureAuth } from '../middlewares/auth.js';

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const router = Router();

// ===== Local Register =====
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
    res.setHeader('Set-Cookie', cookie.serialize('token', token, {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7,
    }));
    res.json({ user: u });
  } catch (e) {
    console.error('[register]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ===== Local Login =====
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const u = await UserModel.verifyLocal(email, password);
    if (!u) return res.status(401).json({ error: 'invalid_credentials' });

    const token = signUser(u);
    res.setHeader('Set-Cookie', cookie.serialize('token', token, {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7,
    }));
    res.json({ user: u });
  } catch (e) {
    console.error('[login]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ===== Logout =====
router.post('/auth/logout', (_req, res) => {
  res.setHeader('Set-Cookie', cookie.serialize('token', '', {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0,
  }));
  res.json({ ok: true });
});

// ===== Me =====
router.get('/auth/me', ensureAuth, async (req, res) => {
  try {
    // req.user ถูกแนบจาก JWT middleware แล้ว (uid, role, ...)
    res.json({
      user: {
        id: req.user.uid || req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: (req.user.role || 'user').toUpperCase(),
      },
    });
  } catch (e) {
    console.error('[auth/me]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

// ===== Google OAuth =====
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND}/login?error=google` }),
  (req, res) => {
    // set JWT cookie then redirect back to FE
    const token = signUser(req.user);
    res.setHeader('Set-Cookie', cookie.serialize('token', token, {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7,
    }));
    // กลับหน้าแรกหรือหน้า login (แล้วแต่คุณ)
    res.redirect(FRONTEND);
  }
);

export default router;
