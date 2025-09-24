import fs from 'fs';
import path from 'path';
import { ProjectModel } from '../models/project.model.js';
import { ActivityModel } from '../models/activity.model.js';
import { emitActivity } from '../lib/socket.js';
import { toProjectJSON, toProjectList } from '../views/project.view.js';

export const ProjectController = {
  create: async (req, res) => {
    try {
      const p = await ProjectModel.create({
        name: req.body.name,
        description: req.body.description ?? '',
      });
      await ActivityModel.add({ projectId: p.id, type: 'PROJECT_CREATED', payload: { name: p.name } });
      emitActivity(p.id, { type: 'PROJECT_CREATED', payload: { name: p.name } });
      res.json(toProjectJSON(p));
    } catch (e) {
      console.error('[Project.create]', e);
      res.status(500).json({ error: 'create project failed' });
    }
  },

  list: async (_req, res) => {
    try {
      const list = await ProjectModel.list();
      res.json(toProjectList(list));
    } catch (e) {
      console.error('[Project.list]', e);
      res.status(500).json({ error: 'list project failed' });
    }
  },

  remove: async (req, res) => {
    const { id } = req.params;
    try {
      const { files } = await ProjectModel.deleteCascade(id);

      // unlink ไฟล์บนดิสก์: รองรับทั้งสคีมาใหม่/เก่า (filename || s3Key)
      for (const f of files) {
        const diskName = f.filename ?? f.s3Key ?? null;
        if (!diskName) continue;
        const fullPath = path.resolve('uploads', f.projectId, diskName);
        try { if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath); } catch {}
      }

      res.status(204).end();
    } catch (e) {
      console.error('[Project.remove]', e);
      res.status(500).json({ error: 'delete project failed' });
    }
  },
};
