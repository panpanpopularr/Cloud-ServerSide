import { FileModel } from '../models/file.model.js';
import { ActivityModel } from '../models/activity.model.js';
import { emitActivity } from '../lib/socket.js';
import path from 'path';
import fs from 'fs';

const toFileJSON = (f) => ({
  id: f.id,
  projectId: f.projectId,
  filename: f.filename ?? f.s3Key ?? '',
  originalname: f.originalname ?? f.name ?? 'file',
  mimetype: f.mimetype ?? f.mimeType ?? 'application/octet-stream',
  size: f.size ?? 0,
  createdAt: f.createdAt ?? f.uploadedAt ?? null,
});

export const FileController = {
  upload: async (req, res) => {
    try {
      const { projectId } = req.params;
      if (!req.file) return res.status(400).json({ error: 'file required' });

      const f = await FileModel.create({
        projectId,
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedBy: 'system',
      });

      await ActivityModel.add({
        projectId,
        type: 'FILE_UPLOADED',
        payload: { id: f.id, name: f.originalname ?? f.name },
      });
      emitActivity(projectId, 'FILE_UPLOADED', {
        name: file.originalname,
        byId: req.user?.id,
        byName: req.user?.name || req.user?.email || '(unknown user)',
      });

      res.json(toFileJSON(f));
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
      const f = await FileModel.findById(id);
      if (!f) return res.status(404).json({ error: 'not found' });

      // ชื่อไฟล์บนดิสก์ (รองรับ schema เก่า/ใหม่)
      const diskName = f.filename ?? f.s3Key ?? null;
      if (diskName) {
        // ✅ ต้องมีโฟลเดอร์ projectId ด้วย (เราอัปโหลดไว้เป็น uploads/<projectId>/<filename>)
        const fullPath = path.resolve('uploads', String(f.projectId), String(diskName));
        try {
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        } catch (err) {
          // ไม่ให้ล้ม แม้ unlink จะพลาด
          console.warn('[File.remove] unlink warn:', err.message);
        }
      }

      // ใช้ deleteMany เพื่อลดโอกาส Prisma โยน error P2025 หาก record ไม่มี
      const { count } = await FileModel.deleteById(id);

      await ActivityModel.add({
        projectId: f.projectId,
        type: 'FILE_DELETED',
        payload: { id: f.id, name: f.originalname ?? f.name },
      });
      emitActivity(projectId, 'FILE_UPLOADED', {
        name: file.originalname,
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
