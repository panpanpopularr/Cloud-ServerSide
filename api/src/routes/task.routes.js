import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import prisma from '../lib/prisma.js';
import { ensureAuth } from '../middlewares/auth.js';
import { logActivity } from '../lib/activity.js';

const router = Router();

/* ---------- Utils upload สำหรับคอมเมนต์ ---------- */
const ensureDir = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const taskId = req.params.id || 'misc';
    const dest = path.resolve('uploads', 'comments', taskId);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = (file.originalname || 'file').replace(/[^\w.\-]/g, '_');
    cb(null, `${ts}_${safe}`);
  },
});
const upload = multer({ storage });

/* ---------- helper ---------- */
const parseDeadline = (v) => {
  if (!v) return null;
  // input type="date" => YYYY-MM-DD (ปลอดภัยกับ Prisma)
  // ถ้าส่งรูปแบบอื่นมา ให้ลอง new Date
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return new Date(v);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* ---------- สร้างงาน ---------- */
router.post('/projects/:projectId/tasks', ensureAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    let { title, deadline, status = 'UNASSIGNED' } = req.body || {};
    if (!String(title || '').trim()) return res.status(400).json({ error: 'bad_request' });

    const creatorId = req.user?.uid || req.user?.id || null;

    const task = await prisma.task.create({
      data: {
        projectId,
        title: String(title).trim(),
        deadline: parseDeadline(deadline),
        status,
        creatorId,
      },
      select: {
        id: true, title: true, status: true, projectId: true, deadline: true, assigneeId: true,
      },
    });

    await logActivity(projectId, 'TASK_CREATED', { taskId: task.id, title: task.title, by: creatorId }, req.user);
    res.json(task);
  } catch (e) {
    console.error('[POST /projects/:projectId/tasks]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/* ---------- list งานในโปรเจกต์ ---------- */
router.get('/projects/:projectId/tasks', ensureAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const items = await prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, status: true, deadline: true, projectId: true,
        assigneeId: true,
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
    res.json({ items });
  } catch (e) {
    console.error('[GET /projects/:projectId/tasks]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/* ---------- รายละเอียดงาน ---------- */
router.get('/tasks/:id', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const t = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true, title: true, status: true, deadline: true, projectId: true,
        creator:  { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });
    if (!t) return res.status(404).json({ error: 'not_found' });
    res.json(t);
  } catch (e) {
    console.error('[GET /tasks/:id]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/* ---------- เปลี่ยนสถานะ ---------- */
router.patch('/tasks/:id', ensureAuth, async (req, res) => {
  try {
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
      taskId: updated.id, title: updated.title, from: prev.status, to: updated.status,
    }, req.user);

    res.json(updated);
  } catch (e) {
    console.error('[PATCH /tasks/:id]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/* ---------- ลบงาน ---------- */
router.delete('/tasks/:id', ensureAuth, async (req, res) => {
  try {
    const prev = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!prev) return res.status(404).json({ error: 'not_found' });

    await prisma.task.delete({ where: { id: req.params.id } });
    await logActivity(prev.projectId, 'TASK_DELETED', { taskId: prev.id, title: prev.title }, req.user);
    res.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /tasks/:id]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/* ---------- มอบหมายงาน (owner เท่านั้น) ---------- */
async function assertOwner(projectId, user) {
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (!p) throw Object.assign(new Error('not_found'), { status: 404 });
  const uid = user?.uid || user?.id;
  if (p.ownerId !== uid) throw Object.assign(new Error('forbidden'), { status: 403 });
  return p;
}

router.patch('/tasks/:id/assign', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body || {};
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'not_found' });

    await assertOwner(task.projectId, req.user);

    const updated = await prisma.task.update({
      where: { id },
      data: { assigneeId: userId || null },
      select: {
        id: true, title: true, projectId: true,
        assigneeId: true,
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    await logActivity(task.projectId, 'TASK_ASSIGNED', {
      taskId: task.id,
      title: task.title,
      to: userId ? (updated.assignee?.name || updated.assignee?.email || updated.assigneeId) : null
    }, req.user);

    res.json(updated);
  } catch (e) {
    console.error('[PATCH /tasks/:id/assign]', e);
    res.status(e.status || 500).json({ error: e.message || 'server_error' });
  }
});

/* ---------- คอมเมนต์ (list) ---------- */
router.get('/tasks/:id/comments', ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const items = await prisma.taskComment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, body: true, createdAt: true,
        fileName: true, mimeType: true, fileSize: true, filePath: true,
        author: { select: { id: true, name: true, email: true } },
      },
    });

    const mapped = items.map(c => ({
      ...c,
      fileUrl: c.filePath ? `/uploads/${c.filePath.replace(/\\/g, '/')}` : null,
    }));

    res.json({ items: mapped });
  } catch (e) {
    console.error('[GET /tasks/:id/comments]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

/* ---------- คอมเมนต์ (create + แนบไฟล์) ---------- */
router.post('/tasks/:id/comments', ensureAuth, upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const raw = (req.body?.body || '').toString();
    const body = raw.trim();
    if (!body && !req.file) return res.status(400).json({ error: 'bad_request' });

    const t = await prisma.task.findUnique({ where: { id }, select: { id: true, projectId: true, title: true } });
    if (!t) return res.status(404).json({ error: 'not_found' });

    const authorId = req.user?.uid || req.user?.id;

    let filePayload = {};
    if (req.file) {
      const relPath = path.relative(path.resolve('uploads'), req.file.path);
      filePayload = {
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: relPath,
      };
    }

    const c = await prisma.taskComment.create({
      data: { taskId: id, authorId, body: body || '', ...filePayload },
      select: {
        id: true, body: true, createdAt: true,
        fileName: true, mimeType: true, fileSize: true, filePath: true,
        author: { select: { id: true, name: true, email: true } },
      },
    });

    await logActivity(
      t.projectId,
      'TASK_COMMENTED',
      { taskId: t.id, title: t.title, comment: body.slice(0, 140) },
      req.user
    );

    res.json({ comment: { ...c, fileUrl: c.filePath ? `/uploads/${c.filePath.replace(/\\/g, '/')}` : null } });
  } catch (e) {
    console.error('[POST /tasks/:id/comments]', e);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
