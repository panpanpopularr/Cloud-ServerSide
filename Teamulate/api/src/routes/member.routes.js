// api/src/routes/member.routes.js
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { emitActivity } from '../lib/socket.js';

const router = Router();

/**
 * GET /projects/:projectId/members
 * → ดึงรายชื่อสมาชิกในโปรเจกต์
 */
router.get('/projects/:projectId/members', async (req, res) => {
  try {
    const { projectId } = req.params;
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    res.json(members);
  } catch (e) {
    console.error('[GET members]', e);
    res.status(500).json({ error: 'list members failed' });
  }
});

/**
 * POST /projects/:projectId/members
 * body: { userId }
 * → เชิญเพื่อนเข้าร่วมโปรเจกต์
 */
router.post('/projects/:projectId/members', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const member = await prisma.projectMember.create({
      data: { projectId, userId, role: 'editor' },
    });

    emitActivity(projectId, 'MEMBER_ADDED', { userId });
    res.status(201).json(member);
  } catch (e) {
    console.error('[ADD member]', e);
    res.status(500).json({ error: 'add member failed' });
  }
});

/**
 * DELETE /projects/:projectId/members/:userId
 * → ลบสมาชิกออกจากโปรเจกต์
 */
router.delete('/projects/:projectId/members/:userId', async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });

    emitActivity(projectId, 'MEMBER_REMOVED', { userId });
    res.json({ ok: true });
  } catch (e) {
    console.error('[REMOVE member]', e);
    res.status(500).json({ error: 'remove member failed' });
  }
});

export default router;
