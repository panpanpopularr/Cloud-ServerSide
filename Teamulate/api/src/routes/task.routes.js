import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';

const router = Router();

// อย่าส่งเป็น TaskController.list() (มีวงเล็บ) — ต้องส่งเป็นตัวฟังก์ชัน
router.get('/projects/:projectId/tasks', TaskController.list);
router.post('/projects/:projectId/tasks', TaskController.create);
router.patch('/tasks/:id', TaskController.updateStatus);
router.delete('/tasks/:id', TaskController.remove);

export default router;
