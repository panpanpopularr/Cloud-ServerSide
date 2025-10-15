// api/src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,          // ถ้า deploy บน HTTPS ให้เปลี่ยนเป็น true
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 วัน
};

function issueToken(res, user) {
  const payload = { id: user.id, email: user.email, name: user.name };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, COOKIE_OPTS);
  return payload;
}

export const AuthController = {
  register: async (req, res) => {
    try {
      const { email, name, password } = req.body || {};
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'missing fields' });
      }
      const existed = await UserModel.findByEmail(email);
      if (existed) return res.status(409).json({ error: 'email already used' });

      const hash = await bcrypt.hash(password, 10);
      const user = await UserModel.createWithPassword({
        email,
        name,
        passwordHash: hash,
      });

      const profile = issueToken(res, user);
      res.status(201).json({ user: profile });
    } catch (e) {
      console.error('[Auth.register]', e);
      res.status(500).json({ error: 'register failed' });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'missing fields' });

      const user = await UserModel.findByEmail(email);
      if (!user || !user.passwordHash) return res.status(401).json({ error: 'invalid credentials' });

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: 'invalid credentials' });

      const profile = issueToken(res, user);
      res.json({ user: profile });
    } catch (e) {
      console.error('[Auth.login]', e);
      res.status(500).json({ error: 'login failed' });
    }
  },

  me: async (req, res) => {
    // req.user ถูกใส่โดย authRequired
    res.json({ user: req.user });
  },

  logout: async (_req, res) => {
    res.clearCookie('token', { path: '/' });
    res.json({ ok: true });
  },
};
