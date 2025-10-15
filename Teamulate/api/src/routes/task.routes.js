// api/src/routes/task.routes.js
import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';

const router = Router();

// ✅ เอา middleware ตรวจสิทธิ์ออกก่อน (ชั่วคราว)
router.get('/projects/:projectId/tasks', TaskController.list);
router.post('/projects/:projectId/tasks', TaskController.create);
router.patch('/tasks/:id', TaskController.update);
router.patch('/tasks/:id/status', TaskController.updateStatus);
router.put('/tasks/:id/assignees', TaskController.setAssignees);
router.post('/tasks/:id/comments', TaskController.comment);
router.delete('/tasks/:id', TaskController.remove);

export default router;
