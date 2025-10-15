import { TaskModel } from '../models/task.model.js';
import { ActivityModel } from '../models/activity.model.js';
import { emitActivity } from '../lib/socket.js';
import { normalizeStatus, DEFAULT_STATUS_CODE } from '../utils/status.js';

export const TaskController = {
  create: async (req, res) => {
    try {
      const { projectId } = req.params;
      let { title, description, deadline, status } = req.body || {};

      if (!title?.trim()) {
        return res.status(400).json({ error: 'title required' });
      }

      const norm = normalizeStatus(status) ?? DEFAULT_STATUS_CODE;

      const task = await TaskModel.create({
        projectId,
        title: title.trim(),
        description: description ?? null,
        deadline: deadline || null,
        status: norm,
      });

      await ActivityModel.add({
        projectId,
        type: 'TASK_CREATED',
        payload: { id: task.id, title: task.title, status: task.status ?? norm, by: req.user?.id ?? 'system' },
      });
      emitActivity(projectId, { type: 'TASK_CREATED', payload: { id: task.id } });

      res.json(task);
    } catch (e) {
      console.error('[Task.create]', e);
      res.status(500).json({ error: 'create task failed' });
    }
  },

  list: async (req, res) => {
    try {
      const { projectId } = req.params;
      const { status, q } = req.query || {};
      const norm = status ? normalizeStatus(status) : undefined;
      const tasks = await TaskModel.listByProject(projectId, { status: norm, q });
      res.json(tasks);
    } catch (e) {
      console.error('[Task.list]', e);
      res.status(500).json({ error: 'list task failed' });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const patch = {};
      if (req.body?.title !== undefined) patch.title = String(req.body.title ?? '').trim();
      if (req.body?.description !== undefined) patch.description = req.body.description ?? null;
      if (req.body?.deadline !== undefined) patch.deadline = req.body.deadline ? new Date(req.body.deadline) : null;
      if (req.body?.status !== undefined) {
        const norm = normalizeStatus(req.body.status);
        if (!norm) return res.status(400).json({ error: 'invalid status' });
        patch.status = norm;
      }

      const before = await TaskModel.findById(id);
      if (!before) return res.status(404).json({ error: 'not_found' });

      const after = await TaskModel.update(id, patch);

      if (patch.status && before.status !== after.status) {
        await ActivityModel.add({
          projectId: after.projectId,
          type: 'TASK_STATUS_CHANGED',
          payload: { taskId: id, from: before.status, to: after.status, by: req.user?.id ?? 'system' },
        });
        emitActivity(after.projectId, { type: 'TASK_STATUS_CHANGED', payload: { taskId: id, to: after.status } });
      }

      res.json(after);
    } catch (e) {
      console.error('[Task.update]', e);
      res.status(500).json({ error: 'update task failed' });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const norm = normalizeStatus(req.body?.status);
      if (!norm) return res.status(400).json({ error: 'invalid status' });

      const before = await TaskModel.findById(id);
      if (!before) return res.status(404).json({ error: 'not_found' });

      const t = await TaskModel.updateStatus(id, norm);

      await ActivityModel.add({
        projectId: t.projectId,
        type: 'TASK_STATUS_CHANGED',
        payload: { taskId: id, from: before.status, to: t.status, by: req.user?.id ?? 'system' },
      });
      emitActivity(t.projectId, { type: 'TASK_STATUS_CHANGED', payload: { taskId: id, to: t.status } });

      res.json(t);
    } catch (e) {
      console.error('[Task.updateStatus]', e);
      res.status(500).json({ error: 'update task failed' });
    }
  },

  setAssignees: async (req, res) => {
    try {
      const { id } = req.params;
      const { userIds } = req.body || {};
      if (!Array.isArray(userIds)) return res.status(400).json({ error: 'userIds must be array' });

      const task = await TaskModel.findById(id);
      if (!task) return res.status(404).json({ error: 'not_found' });

      const saved = await TaskModel.setAssignees(id, userIds);

      await ActivityModel.add({
        projectId: task.projectId,
        type: 'TASK_ASSIGNED',
        payload: { taskId: id, userIds, by: req.user?.id ?? 'system' },
      });
      emitActivity(task.projectId, { type: 'TASK_ASSIGNED', payload: { taskId: id, userIds } });

      res.json(saved);
    } catch (e) {
      console.error('[Task.setAssignees]', e);
      res.status(500).json({ error: 'assign failed' });
    }
  },

  comment: async (req, res) => {
    try {
      const { id } = req.params;
      const { comment } = req.body || {};
      if (!comment?.trim()) return res.status(400).json({ error: 'comment required' });

      const task = await TaskModel.findById(id);
      if (!task) return res.status(404).json({ error: 'not_found' });

      await ActivityModel.add({
        projectId: task.projectId,
        type: 'TASK_COMMENTED',
        payload: { taskId: id, text: comment.trim(), by: req.user?.id ?? 'system' },
      });
      emitActivity(task.projectId, { type: 'TASK_COMMENTED', payload: { taskId: id } });

      res.json({ ok: true });
    } catch (e) {
      console.error('[Task.comment]', e);
      res.status(500).json({ error: 'comment failed' });
    }
  },

  remove: async (req, res) => {
    try {
      const { id } = req.params;
      const t = await TaskModel.findById(id);
      if (!t) return res.status(404).json({ error: 'not_found' });

      await TaskModel.deleteById(id);

      await ActivityModel.add({
        projectId: t.projectId,
        type: 'TASK_DELETED',
        payload: { taskId: id, by: req.user?.id ?? 'system' },
      });
      emitActivity(t.projectId, { type: 'TASK_DELETED', payload: { taskId: id } });

      res.json({ ok: true });
    } catch (e) {
      console.error('[Task.remove]', e);
      res.status(500).json({ error: 'delete task failed' });
    }
  },
};
