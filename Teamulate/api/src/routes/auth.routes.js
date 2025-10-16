// api/src/routes/auth.routes.js
import { Router } from 'express';
import passport from '../lib/passport.js';
import { register, login, me, logout, googleCallback } from '../controllers/auth.controller.js';

const router = Router();

// Local
router.post('/auth/register', register);
router.post('/auth/login',    login);
router.get('/auth/me',        me);      // public: คืน { user:null } ถ้าไม่มี token
router.post('/auth/logout',   logout);

// Aliases เผื่อ FE เดิมบางที่เรียกโดยไม่มี /auth
router.post('/register', register);
router.post('/login',    login);
router.get('/me',        me);
router.post('/logout',   logout);

// Google OAuth
router.get('/auth/google', passport.authenticate('google', { scope: ['profile','email'], session: false }));
router.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  googleCallback
);

export default router;
