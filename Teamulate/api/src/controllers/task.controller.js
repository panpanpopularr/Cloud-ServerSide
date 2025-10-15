import { TaskModel } from '../models/task.model.js';
import { ActivityModel } from '../models/activity.model.js';
import { emitActivity } from '../lib/socket.js';

const VALID_STATUS = new Set(['ACTIVE', 'UNASSIGNED', 'CANCELED', 'REVIEW', 'DONE']);

export const TaskController = {
  create: async (req, res) => {
    try {
      const { projectId } = req.params;
      let { title, description, deadline, status } = req.body || {};

      if (!title || !title.trim()) return res.status(400).json({ error: 'title required' });
      title = title.trim();

      // กันค่าที่ UI ส่งมาแปลก ๆ
      if (!VALID_STATUS.has(status)) status = 'UNASSIGNED';

      const task = await TaskModel.create({
        projectId,
        title,
        description,
        deadline,
        status,
        creatorId: req.user?.id || null,
      });

      // log activity
      try {
        await ActivityModel.add({
          projectId,
          type: 'TASK_CREATED',
          payload: { id: task.id, title: task.title },
        });
      } catch {}

      emitActivity(projectId, {
        type: 'TASK_CREATED',
        payload: { id: task.id, title: task.title },
      });

      res.json(task);
    } catch (e) {
      console.error('[Task.create]', e?.message, e?.cause || '');
      res.status(500).json({ error: 'create task failed', detail: e?.message });
    }
  },

  list: async (req, res) => {
    try {
      const tasks = await TaskModel.listByProject(req.params.projectId);
      res.json(tasks);
    } catch (e) {
      console.error('[Task.list]', e);
      res.status(500).json({ error: 'list task failed' });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!VALID_STATUS.has(status)) return res.status(400).json({ error: 'bad status' });
      const t = await TaskModel.updateStatus(id, status);
      res.json(t);
    } catch (e) {
      console.error('[Task.updateStatus]', e);
      res.status(500).json({ error: 'update task failed' });
    }
  },

  remove: async (req, res) => {
    try {
      const { id } = req.params;
      const t = await TaskModel.deleteById(id);
      res.json(t);
    } catch (e) {
      console.error('[Task.remove]', e);
      res.status(500).json({ error: 'delete task failed' });
    }
  },
};
