// api/src/routes/task.routes.js
import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { ensureAuth, ensureProjectAccess } from '../middlewares/ensureAuth.js';

const router = Router();

// ปล่อย preflight
router.options('/projects/:projectId/tasks', (_req, res) => res.sendStatus(204));
router.options('/tasks/:id', (_req, res) => res.sendStatus(204));
router.options('/tasks/:id/status', (_req, res) => res.sendStatus(204));
router.options('/tasks/:id/assignees', (_req, res) => res.sendStatus(204));
router.options('/tasks/:id/comments', (_req, res) => res.sendStatus(204));

// ป้องกันและจำกัดสิทธิ์
router.get('/projects/:projectId/tasks', ensureAuth, ensureProjectAccess('projectId'), TaskController.list);
router.post('/projects/:projectId/tasks', ensureAuth, ensureProjectAccess('projectId'), TaskController.create);

router.patch('/tasks/:id', ensureAuth, TaskController.update);
router.patch('/tasks/:id/status', ensureAuth, TaskController.updateStatus);
router.put('/tasks/:id/assignees', ensureAuth, TaskController.setAssignees);
router.post('/tasks/:id/comments', ensureAuth, TaskController.comment);
router.delete('/tasks/:id', ensureAuth, TaskController.remove);

export default router;
