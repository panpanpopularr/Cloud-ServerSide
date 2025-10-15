import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { ensureAuth } from '../middlewares/auth.js';
import { actorOf } from '../lib/actor.js';

const router = Router();

// รายชื่อสมาชิก
router.get('/projects/:projectId/members', ensureAuth, async (req, res) => {
  const { projectId } = req.params;
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: { user: true },
    orderBy: { id: 'asc' },
  });
  res.json(members);
});

// เชิญสมาชิก (owner หรือ admin)
router.post('/projects/:projectId/members', ensureAuth, async (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'bad_request' });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: 'project_not_found' });

  const role = (req.user.role || '').toString().toLowerCase();
  const isOwner = req.user.uid === project.ownerId;
  const isAdmin = role === 'admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'forbidden' });
  }

  // สร้าง member (กันซ้ำด้วย unique(projectId,userId))
  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {},
    create: { projectId, userId },
    include: { user: true },
  });

  // log activity (แสดงชื่อผู้เชิญ)
  await prisma.activity.create({
    data: {
      projectId,
      type: 'MEMBER_ADDED',
      payload: {
        userId,
        by: actorOf(req),
      },
    },
  });

  res.json(member);
});

// เอาสมาชิกออก (✅ owner เท่านั้น; admin ที่ไม่ใช่ owner ห้าม)
router.delete('/projects/:projectId/members/:userId', ensureAuth, async (req, res) => {
  const { projectId, userId } = req.params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return res.status(404).json({ error: 'project_not_found' });

  const isOwner = req.user.uid === project.ownerId;
  if (!isOwner) {
    return res.status(403).json({ error: 'only_owner_can_remove_member' });
  }
  if (userId === project.ownerId) {
    return res.status(400).json({ error: 'cannot_remove_owner' });
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  });

  await prisma.activity.create({
    data: {
      projectId,
      type: 'MEMBER_REMOVED',
      payload: {
        userId,
        by: actorOf(req), // ✅ ชื่อคนลบ
      },
    },
  });

  res.json({ ok: true });
});

export default router;
