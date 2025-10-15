// api/src/routes/file.routes.js
import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.js';
import prisma from '../lib/prisma.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { logActivity } from '../lib/activity.js';

const router = Router();
const upload = multer({ dest: path.resolve('uploads/tmp') });

// อัปโหลดไฟล์
router.post('/projects/:projectId/files/upload', ensureAuth, upload.single('file'), async (req, res) => {
  const { projectId } = req.params;
  const f = req.file;
  if (!f) return res.status(400).json({ error: 'no_file' });

  const outDir = path.resolve('uploads', projectId);
  fs.mkdirSync(outDir, { recursive: true });
  const finalPath = path.join(outDir, f.originalname);
  fs.renameSync(f.path, finalPath);

  const rec = await prisma.file.create({
    data: {
      projectId,
      originalname: f.originalname,
      filename: f.originalname,
      size: f.size,
    },
    select: { id: true, projectId: true, originalname: true, filename: true, size: true },
  });

  await logActivity(projectId, 'FILE_UPLOADED', { name: rec.originalname }, req.user);

  res.json(rec);
});

// ลบไฟล์
router.delete('/files/:id', ensureAuth, async (req, res) => {
  const file = await prisma.file.findUnique({ where: { id: req.params.id } });
  if (!file) return res.status(404).json({ error: 'not_found' });

  await prisma.file.delete({ where: { id: file.id } });
  const p = path.resolve('uploads', file.projectId, file.filename || '');
  if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch {}

  await logActivity(file.projectId, 'FILE_DELETED', { name: file.originalname }, req.user);

  res.json({ ok: true });
});

export default router;
