import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { ensureAuth } from '../middlewares/auth.js';

// ถ้าไม่อยาก import ให้คัดลอกฟังก์ชันนี้มาแทนก็ได้
import { actorOf } from '../lib/actor.js';

const router = Router();

/** ===== LIST: tasks ของโปรเจกต์ ===== */
router.get('/projects/:projectId/tasks', ensureAuth, async (req, res) => {
  const { projectId } = req.params;
  const items = await prisma.task.findMany({
    where: { projectId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  res.json({ items });
});

/** ===== CREATE ===== */
router.post('/projects/:projectId/tasks', ensureAuth, async (req, res) => {
  const { projectId } = req.params;
  const { title, deadline, status } = req.body || {};
  if (!title?.trim()) return res.status(400).json({ error: 'bad_request' });

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      deadline: deadline ? new Date(deadline) : null,
      status,
      projectId,
      creatorId: req.user.uid ?? null,
    },
  });

  await prisma.activity.create({
    data: {
      projectId,
      type: 'TASK_CREATED',
      payload: {
        taskId: task.id,
        title: task.title,
        by: actorOf(req),
      },
    },
  });

  res.json(task);
});

/** ===== UPDATE (เช่น เปลี่ยนสถานะ/ชื่อ/เดดไลน์) ===== */
router.patch('/tasks/:id', ensureAuth, async (req, res) => {
  const { id } = req.params;
  const { status, title, deadline } = req.body || {};

  const before = await prisma.task.findUnique({ where: { id } });
  if (!before) return res.status(404).json({ error: 'not_found' });

  const after = await prisma.task.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(title !== undefined ? { title } : {}),
      ...(deadline !== undefined ? { deadline: deadline ? new Date(deadline) : null } : {}),
    },
  });

  if (status && status !== before.status) {
    await prisma.activity.create({
      data: {
        projectId: before.projectId,
        type: 'TASK_STATUS_CHANGED',
        payload: {
          taskId: id,
          title: after.title,
          from: before.status,
          to: after.status,
          by: actorOf(req),
        },
      },
    });
  }

  res.json(after);
});

/** ===== DELETE ===== */
router.delete('/tasks/:id', ensureAuth, async (req, res) => {
  const { id } = req.params;

  const t = await prisma.task.findUnique({ where: { id } });
  if (!t) return res.status(404).json({ error: 'not_found' });

  await prisma.task.delete({ where: { id } });

  await prisma.activity.create({
    data: {
      projectId: t.projectId,
      type: 'TASK_DELETED',
      payload: {
        taskId: id,
        title: t.title,
        by: actorOf(req),
      },
    },
  });

  res.json({ ok: true });
});

export default router;
