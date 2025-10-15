import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { ensureAuth } from '../middlewares/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

/**
 * ตรวจสิทธิ์เห็นโปรเจกต์:
 * - owner ของโปรเจกต์
 * - หรือเป็นสมาชิก (ถูกเชิญอยู่ใน ProjectMember)
 */
async function ensureProjectVisible(req, res, next) {
  try {
    const userId = req.user?.id;
    const projectId = req.params.projectId;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      select: { id: true },
    });

    if (!project) return res.status(403).json({ error: 'forbidden' });
    return next();
  } catch (e) {
    console.error('[ensureProjectVisible]', e);
    return res.status(500).json({ error: 'internal error' });
  }
}

/**
 * สำหรับ route ที่มีเฉพาะ taskId (เช่น PATCH/DELETE)
 * จะโหลด task -> เอา projectId -> ตรวจสิทธิ์กับโปรเจกต์นั้น
 */
async function ensureTaskProjectVisible(req, res, next) {
  try {
    const userId = req.user?.id;
    const taskId = req.params.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    if (!task) return res.status(404).json({ error: 'task not found' });

    const project = await prisma.project.findFirst({
      where: {
        id: task.projectId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      select: { id: true },
    });

    if (!project) return res.status(403).json({ error: 'forbidden' });
    // แนบ projectId ไว้ใช้ต่อได้ถ้าจำเป็น
    req.projectIdFromTask = task.projectId;
    return next();
  } catch (e) {
    console.error('[ensureTaskProjectVisible]', e);
    return res.status(500).json({ error: 'internal error' });
  }
}

// ---------- Routes ----------

// ดึงรายการงานในโปรเจกต์
router.get(
  '/projects/:projectId/tasks',
  ensureAuth,
  ensureProjectVisible,
  TaskController.list
);

// สร้างงานใหม่ในโปรเจกต์
router.post(
  '/projects/:projectId/tasks',
  ensureAuth,
  ensureProjectVisible,
  TaskController.create
);

// อัปเดตสถานะงาน
router.patch(
  '/tasks/:id',
  ensureAuth,
  ensureTaskProjectVisible,
  TaskController.updateStatus
);

// ลบงาน
router.delete(
  '/tasks/:id',
  ensureAuth,
  ensureTaskProjectVisible,
  TaskController.remove
);

export default router;
