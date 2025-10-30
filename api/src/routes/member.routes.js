// api/src/routes/member.routes.js
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { ensureAuth } from '../middlewares/auth.js';
import { logActivity } from '../lib/activity.js';

const router = Router();

async function assertOwner(projectId, user) {
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!p) throw Object.assign(new Error('not_found'), { status: 404 });
  const uid = user?.uid || user?.id;
  if (p.ownerId !== uid) throw Object.assign(new Error('forbidden'), { status: 403 });
  return p;
}

// ✅ helper: ตรวจว่า user เป็น owner หรือเป็น member ของโปรเจกต์
async function assertReadable(projectId, user) {
  const uid = user?.uid || user?.id;
  const p = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!p) throw Object.assign(new Error('not_found'), { status: 404 });
  if (p.ownerId === uid) return true;

  const m = await prisma.projectMember.findFirst({
    where: { projectId, userId: uid },
    select: { id: true },
  });
  if (!m) throw Object.assign(new Error('forbidden'), { status: 403 });
  return true;
}

// ✅ อ่านรายชื่อสมาชิก (owner/member อ่านได้)
router.get('/projects/:projectId/members', ensureAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    await assertReadable(projectId, req.user);

    const items = await prisma.projectMember.findMany({
      where: { projectId },
      orderBy: { userId: 'asc' },
      select: {
        userId: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(items);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'server_error' });
  }
});

// เชิญสมาชิก (owner เท่านั้น)
router.post('/projects/:projectId/members', ensureAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'bad_request' });

    await assertOwner(projectId, req.user);

    await prisma.projectMember.create({ data: { projectId, userId } });
    await logActivity(projectId, 'MEMBER_ADDED', { userId }, req.user);

    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'server_error' });
  }
});

// ถอดสมาชิก (owner เท่านั้น)
router.delete('/projects/:projectId/members/:userId', ensureAuth, async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    await assertOwner(projectId, req.user);

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
    await logActivity(projectId, 'MEMBER_REMOVED', { userId }, req.user);

    res.json({ ok: true });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'server_error' });
  }
});

export default router;
