// api/src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { signUser, setAuthCookie } from '../lib/jwt.js';

export const register = async (req, res) => {
  try {
    const email = (req.body?.email || '').toLowerCase().trim();
    const name = (req.body?.name || '').trim() || null;
    const password = (req.body?.password || '').toString();

    if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hashed, role: 'user' },
      select: { id: true, email: true, role: true, name: true },
    });

    const token = signUser(user);
    setAuthCookie(res, token);
    res.status(201).json({ user });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'email_taken' });
    console.error('register error:', e);
    res.status(500).json({ error: 'server_error' });
  }
};

export const login = async (req, res) => {
  try {
    const email = (req.body?.email || '').toLowerCase().trim();
    const password = (req.body?.password || '').toString();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(401).json({ error: 'invalid_credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    const safe = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = signUser(safe);
    setAuthCookie(res, token);
    res.json({ user: safe });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ error: 'server_error' });
  }
};

// ไม่ 401 เพื่อกัน flash ตอน refresh; จะได้ { user: null } ถ้าไม่มี token
export const me = async (req, res) => {
  res.json({ user: req.user || null });
};

export const logout = async (_req, res) => {
  res.clearCookie('jwt', { path: '/' });
  res.json({ ok: true });
};

/* Google callback (ไว้กรณีใช้ Google) */
export const googleCallback = async (req, res) => {
  try {
    const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (!req.user) return res.redirect(`${FRONTEND}/login?auth=failed`);
    const token = signUser(req.user);
    setAuthCookie(res, token);
    const role = (req.user.role || '').toLowerCase();
    return res.redirect(`${FRONTEND}${role === 'admin' ? '/admin' : '/workspace'}?auth=google`);
  } catch (e) {
    const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
    console.error('google callback error:', e);
    return res.redirect(`${FRONTEND}/login?auth=error`);
  }
};
