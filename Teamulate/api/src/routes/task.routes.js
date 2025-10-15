// api/src/routes/task.routes.js
import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { ensureAuth } from '../middlewares/auth.js';
import { logActivity } from '../lib/activity.js';

const router = Router();

// สร้างงาน
router.post('/projects/:projectId/tasks', ensureAuth, async (req, res) => {
  const { projectId } = req.params;
  const { title, deadline, status = 'UNASSIGNED' } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'bad_request' });

  const task = await prisma.task.create({
    data: { projectId, title: title.trim(), deadline: deadline || null, status },
    select: { id: true, title: true, status: true, projectId: true, deadline: true },
  });

  await logActivity(projectId, 'TASK_CREATED', {
    taskId: task.id,
    title: task.title,
    status: task.status,
  }, req.user);

  res.json(task);
});

// เปลี่ยนสถานะงาน
router.patch('/tasks/:id', ensureAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  const prev = await prisma.task.findUnique({ where: { id } });
  if (!prev) return res.status(404).json({ error: 'not_found' });

  const updated = await prisma.task.update({
    where: { id },
    data: { status },
    select: { id: true, title: true, status: true, projectId: true },
  });

  await logActivity(updated.projectId, 'TASK_STATUS_CHANGED', {
    taskId: updated.id,
    title: updated.title,
    from: prev.status,
    to: updated.status,
  }, req.user);

  res.json(updated);
});

// ลบงาน
router.delete('/tasks/:id', ensureAuth, async (req, res) => {
  const prev = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!prev) return res.status(404).json({ error: 'not_found' });

  await prisma.task.delete({ where: { id: req.params.id } });

  await logActivity(prev.projectId, 'TASK_DELETED', {
    taskId: prev.id,
    title: prev.title,
  }, req.user);

  res.json({ ok: true });
});

export default router;
