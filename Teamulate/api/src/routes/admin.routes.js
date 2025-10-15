// api/src/routes/admin.routes.js
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { ensureAdmin } from '../middlewares/auth.js';

const router = Router();

// list all users
router.get('/admin/users', ensureAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  res.json({ items: users });
});

// update user (name/role)
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

// (optional) delete user
router.delete('/admin/users/:id', ensureAdmin, async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
