import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma.js';
import { ensureAuth } from '../middlewares/auth.js';
import { actorOf } from '../lib/actor.js';

const upload = multer({ dest: path.resolve('uploads/tmp') });
const router = Router();

/** ===== LIST: files ของโปรเจกต์ ===== */
router.get('/projects/:projectId/files', ensureAuth, async (req, res) => {
  const { projectId } = req.params;
  const items = await prisma.file.findMany({
    where: { projectId },
    orderBy: { uploadedAt: 'desc' },
  });
  res.json(items);
});

/** ===== UPLOAD ===== */
router.post('/projects/:projectId/files/upload', ensureAuth, upload.single('file'), async (req, res) => {
  const { projectId } = req.params;
  const f = req.file;
  if (!f) return res.status(400).json({ error: 'no_file' });

  const dir = path.resolve('uploads', projectId);
  fs.mkdirSync(dir, { recursive: true });
  const newPath = path.join(dir, f.originalname);
  fs.renameSync(f.path, newPath);

  const fileRec = await prisma.file.create({
    data: {
      projectId,
      filename: f.originalname,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
    },
  });

  await prisma.activity.create({
    data: {
      projectId,
      type: 'FILE_UPLOADED',
      payload: {
        name: f.originalname,
        by: actorOf(req),
      },
    },
  });

  res.json(fileRec);
});

/** ===== DELETE ===== */
router.delete('/files/:id', ensureAuth, async (req, res) => {
  const { id } = req.params;
  const fileRec = await prisma.file.findUnique({ where: { id } });
  if (!fileRec) return res.status(404).json({ error: 'not_found' });

  const fp = path.resolve('uploads', fileRec.projectId, fileRec.filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);

  await prisma.file.delete({ where: { id } });

  await prisma.activity.create({
    data: {
      projectId: fileRec.projectId,
      type: 'FILE_DELETED',
      payload: {
        name: fileRec.originalname || fileRec.filename,
        by: actorOf(req),
      },
    },
  });

  res.json({ ok: true });
});

export default router;
