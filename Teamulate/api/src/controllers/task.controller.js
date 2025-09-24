import { TaskModel } from '../models/task.model.js';
import { ActivityModel } from '../models/activity.model.js';
import { emitActivity } from '../lib/socket.js';

export const TaskController = {
  create: async (req, res) => {
    try {
      const { projectId } = req.params;
      const { title, description, deadline, status } = req.body;

      const task = await TaskModel.create({
        projectId,
        title,
        description,
        deadline: deadline ? new Date(deadline) : null,
        status,
      });

      await ActivityModel.add({
        projectId,
        type: 'TASK_CREATED',
        payload: { id: task.id, title: task.title },
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
