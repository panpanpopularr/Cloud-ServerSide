// api/src/routes/member.routes.js
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { ensureAuth } from '../middlewares/auth.js';
import { logActivity } from '../lib/activity.js';

const router = Router();

// เชิญสมาชิก
router.post('/projects/:projectId/members', ensureAuth, async (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'bad_request' });

  await prisma.projectMember.create({ data: { projectId, userId } });

  await logActivity(projectId, 'MEMBER_ADDED', { userId }, req.user);

  res.json({ ok: true });
});

// ถอดสมาชิก
router.delete('/projects/:projectId/members/:userId', ensureAuth, async (req, res) => {
  const { projectId, userId } = req.params;
  await prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } });

  await logActivity(projectId, 'MEMBER_REMOVED', { userId }, req.user);

  res.json({ ok: true });
});

export default router;
