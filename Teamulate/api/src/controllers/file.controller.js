import { FileModel } from '../models/file.model.js';
import { ActivityModel } from '../models/activity.model.js';
import { emitActivity } from '../lib/socket.js';
import path from 'path';
import fs from 'fs';

const toFileJSON = (f) => ({
  id: f.id,
  projectId: f.projectId,
  filename: f.filename ?? f.s3Key,
  originalname: f.originalname ?? f.name,
  mimetype: f.mimetype ?? f.mimeType,
  size: f.size,
  createdAt: f.createdAt ?? f.uploadedAt,
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
      emitActivity(projectId, { type: 'FILE_UPLOADED', payload: { id: f.id } });

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

      try {
        fs.unlinkSync(path.resolve('uploads', f.filename ?? f.s3Key));
      } catch {
        console.warn('[File.remove] local file not found, continue');
      }

      await FileModel.deleteById(id);
      res.json({ ok: true });
    } catch (e) {
      console.error('[File.remove]', e);
      res.status(500).json({ error: 'delete failed' });
    }
  },
};
