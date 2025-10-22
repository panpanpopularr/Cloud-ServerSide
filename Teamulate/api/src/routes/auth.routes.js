import { Router } from 'express';
import passport from '../lib/passport.js';
import {
  register, login, me, logout,
  googleCallback, finalizeFromToken
} from '../controllers/auth.controller.js';

const router = Router();

// Local
router.post('/auth/register', register);
router.post('/auth/login',    login);
router.get('/auth/me',        me);
router.post('/auth/logout',   logout);

// Aliases (รองรับ FE ที่เรียกแบบไม่มี /auth)
router.post('/register', register);
router.post('/login',    login);
router.get('/me',        me);
router.post('/logout',   logout);

// ✅ Finalize (รับ token จาก /auth/google/callback แล้วตั้งคุกกี้)
router.post('/auth/finalize', finalizeFromToken);
router.post('/finalize',       finalizeFromToken);

// Google OAuth
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile','email'], session: false })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  googleCallback
);

export default router;
