import { FileModel } from '../models/file.model.js';
import { ActivityModel } from '../models/activity.model.js';
import { emitActivity } from '../lib/socket.js';
import path from 'path';
import fs from 'fs';

const REGION = process.env.AWS_REGION || 'us-east-1';
const BUCKET = process.env.S3_BUCKET || '';

const toFileJSON = (f) => {
  const filename = f.filename ?? f.s3Key ?? '';
  const originalname = f.originalname ?? f.name ?? 'file';
  const mimetype = f.mimetype ?? f.mimeType ?? 'application/octet-stream';
  const size = f.size ?? 0;
  const createdAt = f.uploadedAt ?? f.createdAt ?? null;

  // ถ้ามี s3Key ⇒ ทำ URL S3 ให้เลย
  const url = f.url
    || (f.s3Key && BUCKET ? `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(f.s3Key)}` : null);

  return { id: f.id, projectId: f.projectId, filename, originalname, mimetype, size, createdAt, url };
};

export const FileController = {
  upload: async (req, res) => {
    try {
      const { projectId } = req.params;
      const f = req.file;
      if (!f) return res.status(400).json({ error: 'file required' });

      const rec = await FileModel.create({
        projectId,
        filename: f.filename,        // หรือ s3Key ใน fallback
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        uploadedBy: req.user?.id || 'system',
      });

      await ActivityModel.add({
        projectId,
        type: 'FILE_UPLOADED',
        payload: {
          id: rec.id,
          name: rec.originalname ?? rec.name,
          byId: req.user?.id,
          byName: req.user?.name || req.user?.email || '(unknown user)',
        },
      });

      emitActivity(projectId, 'FILE_UPLOADED', {
        id: rec.id,
        name: rec.originalname ?? rec.name,
        byId: req.user?.id,
        byName: req.user?.name || req.user?.email || '(unknown user)',
      });

      res.json(toFileJSON(rec));
    } catch (e) {
      console.error('[File.upload]', e);
      res.status(500).json({ error: 'upload failed' });
    }
  },

  list: async (req, res) => {
    try {
      const files = await FileModel.listSmart(req.params.projectId);
      res.json(files.map(toFileJSON));
    } catch (e) {
      console.error('[File.list]', e);
      res.status(500).json({ error: 'list files failed' });
    }
  },

  remove: async (req, res) => {
    try {
      const { id } = req.params;
      const rec = await FileModel.findById(id);
      if (!rec) return res.status(404).json({ error: 'not found' });

      // ลบไฟล์บนดิสก์ (รองรับทั้ง filename/s3Key)
      const diskName = rec.filename ?? rec.s3Key ?? null;
      if (diskName) {
        const fullPath = path.resolve('uploads', String(rec.projectId), String(diskName));
        try { if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); } catch (err) {
          console.warn('[File.remove] unlink warn:', err.message);
        }
      }

      const { count } = await FileModel.deleteById(id);

      await ActivityModel.add({
        projectId: rec.projectId,
        type: 'FILE_DELETED',
        payload: {
          id: rec.id,
          name: rec.originalname ?? rec.name,
          byId: req.user?.id,
          byName: req.user?.name || req.user?.email || '(unknown user)',
        },
      });

      emitActivity(rec.projectId, 'FILE_DELETED', {
        id: rec.id,
        name: rec.originalname ?? rec.name,
        byId: req.user?.id,
        byName: req.user?.name || req.user?.email || '(unknown user)',
      });

      res.json({ ok: true, deleted: count });
    } catch (e) {
      console.error('[File.remove]', e);
      res.status(500).json({ error: 'delete failed' });
    }
  },
};
