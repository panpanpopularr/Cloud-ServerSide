import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { ensureAuth } from '../middlewares/auth.js';

const router = Router();

/** อ่านข้อมูลตัวเอง */
router.get('/users/me', ensureAuth, async (req, res) => {
  try {
    const uid = req.user?.uid || req.user?.id;
    const u = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, email: true, name: true, role: true, avatar: true, createdAt: true, updatedAt: true },
    });
    if (!u) return res.status(404).json({ error: 'not_found' });
    res.json(u);
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
});

/** อัปเดตชื่อของตัวเอง */
router.patch('/users/me', ensureAuth, async (req, res) => {
  try {
    const uid = req.user?.uid || req.user?.id;
    const name = (req.body?.name ?? '').toString().trim();

    if (!name) return res.status(400).json({ error: 'name required' });
    if (name.length > 100) return res.status(400).json({ error: 'name too long' });

    const updated = await prisma.user.update({
      where: { id: uid },
      data: { name },
      select: { id: true, email: true, name: true, role: true, avatar: true, createdAt: true, updatedAt: true },
    });

   // sync ชื่อใน session ปัจจุบัน (ถ้าพาสปอร์ต serialize เก็บทั้ง object)
   if (req.user) req.user.name = updated.name;

    res.json({ ok: true, user: updated });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'not_found' });
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
