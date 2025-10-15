import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { ensureAuth, ensureProjectAccess } from '../middlewares/ensureAuth.js';

const router = Router();

router.use('/projects/:projectId/tasks', ensureAuth, ensureProjectAccess('projectId'));
router.get('/projects/:projectId/tasks', TaskController.list);
router.post('/projects/:projectId/tasks', TaskController.create);

router.patch('/tasks/:id', ensureAuth, TaskController.update);
router.patch('/tasks/:id/status', ensureAuth, TaskController.updateStatus);

router.put('/tasks/:id/assignees', ensureAuth, TaskController.setAssignees);
router.post('/tasks/:id/comments', ensureAuth, TaskController.comment);

router.delete('/tasks/:id', ensureAuth, TaskController.remove);

export default router;
