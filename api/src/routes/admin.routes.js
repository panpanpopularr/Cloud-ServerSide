// api/src/routes/admin.routes.js
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { ensureAdmin } from '../middlewares/auth.js'; // <- ต้องมาจากไฟล์ใหม่ด้านบน

const router = Router();

router.get('/admin/users', ensureAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  res.json({ items: users });
});

router.patch('/admin/users/:id', ensureAdmin, async (req, res) => {
  const { name, role } = req.body || {};
  const u = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(role !== undefined ? { role } : {}),
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  res.json({ user: u });
});

router.delete('/admin/users/:id', ensureAdmin, async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
