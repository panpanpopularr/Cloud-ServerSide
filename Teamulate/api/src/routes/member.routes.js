// api/src/routes/member.routes.js
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { ensureAuth } from '../middlewares/auth.js';
import { ActivityModel } from '../models/activity.model.js';

const router = Router();

/**
 * GET /projects/:projectId/members
 * คืนสมาชิกทั้งหมดของโปรเจ็กต์ (พร้อม user info)
 */
router.get('/projects/:projectId/members', ensureAuth, async (req, res) => {
  const { projectId } = req.params;
  const items = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { id: 'desc' },
  });
  res.json(items);
});

/**
 * POST /projects/:projectId/members  { userId }
 * เพิ่มสมาชิกใหม่ ลง activity ให้ด้วย
 */
router.post('/projects/:projectId/members', ensureAuth, async (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.body || {};
  if (!userId?.trim()) return res.status(400).json({ error: 'userId required' });

  // มีอยู่แล้วไม่ซ้ำ
  const created = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {},
    create: { projectId, userId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  await ActivityModel.add({
    projectId,
    type: 'MEMBER_ADDED',
    payload: { userId, by: req.user?.id ?? 'system' },
  });

  res.json(created);
});

/**
 * DELETE /projects/:projectId/members/:userId
 * ลบสมาชิก อนุญาตเฉพาะ owner เท่านั้น
 */
router.delete('/projects/:projectId/members/:userId', ensureAuth, async (req, res) => {
  const { projectId, userId } = req.params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: 'project_not_found' });

  // ✅ อนุญาตเฉพาะเจ้าของโปรเจ็กต์ลบสมาชิกได้
  if (project.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'only_owner_can_remove' });
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  });

  await ActivityModel.add({
    projectId,
    type: 'MEMBER_REMOVED',
    payload: { userId, by: req.user?.id ?? 'system' },
  });

  res.json({ ok: true });
});

export default router;
