// api/src/controllers/auth.controller.js
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { signUser, setAuthCookie, clearAuthCookie } from '../lib/jwt.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const FRONTEND = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/,'');

function sendNoStore(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

/* register */
export const register = async (req, res) => {
  try {
    const email = (req.body?.email || '').toLowerCase().trim();
    const name = (req.body?.name || '').trim() || null;
    const password = (req.body?.password || '').toString();
    if (!email || !password) return res.status(400).json({ error: 'email_and_password_required' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, passwordHash: hashed, role: 'user' },
      select: { id: true, email: true, role: true, name: true },
    });

    const token = signUser(user);
    setAuthCookie(res, token);
    sendNoStore(res);
    res.status(201).json({ user });
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'email_taken' });
    console.error('register error:', e);
    res.status(500).json({ error: 'server_error' });
  }
};

/* login */
export const login = async (req, res) => {
  try {
    const email = (req.body?.email || '').toLowerCase().trim();
    const password = (req.body?.password || '').toString();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });

    const hash = user.passwordHash || user.password;
    if (!hash) return res.status(401).json({ error: 'invalid_credentials' });

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    const safe = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = signUser(safe);
    setAuthCookie(res, token);
    sendNoStore(res);
    res.json({ user: safe });
  } catch (e) {
    console.error('login error:', e);
    res.status(500).json({ error: 'server_error' });
  }
};

/* me */
export const me = async (req, res) => {
  try {
    const id = req.user?.id || req.user?.uid;
    if (!id) { sendNoStore(res); return res.json({ user: null }); }

    const u = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });

    sendNoStore(res);
    return res.json({ user: u || null });
  } catch (e) {
    console.error('[auth.me]', e);
    return res.status(500).json({ error: 'server_error' });
  }
};

/* logout */
export const logout = async (_req, res) => {
  clearAuthCookie(res);
  sendNoStore(res);
  res.json({ ok: true });
};

/* Google callback -> redirect กลับ FE พร้อม token ชั่วคราว */
export async function googleCallback(req, res) {
  try {
    const u = req.user;
    const token = jwt.sign({ uid: u.id }, JWT_SECRET, { expiresIn: '10m' });
    return res.redirect(`${FRONTEND}/login?auth=google&token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.error('[googleCallback]', e);
    return res.redirect(`${FRONTEND}/login?auth=failed`);
  }
}

/* FE ส่ง token ชั่วคราวมาแลกเป็น first-party cookie */
export async function finalizeFromToken(req, res) {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token_required' });

    const payload = jwt.verify(token, JWT_SECRET); // { uid }
    if (!payload?.uid) return res.status(400).json({ error: 'bad_token' });

    const u = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: { id: true, email: true, role: true, name: true },
    });
    if (!u) return res.status(404).json({ error: 'user_not_found' });

    const firstPartyToken = signUser(u);
    setAuthCookie(res, firstPartyToken);
    sendNoStore(res);
    return res.json({ ok: true });
  } catch (e) {
    console.error('[finalizeFromToken]', e);
    return res.status(400).json({ error: 'invalid_token' });
  }
}
