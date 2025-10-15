import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';

const router = Router();

// list / create
router.get('/projects/:projectId/tasks', TaskController.list);
router.post('/projects/:projectId/tasks', TaskController.create);

// update (ครบฟิลด์) + route เดิมสำหรับอัปเดตสถานะอย่างเดียว
router.patch('/tasks/:id', TaskController.update);         // ใหม่: อัปเดตได้หลายฟิลด์
router.patch('/tasks/:id/status', TaskController.updateStatus); // เดิม: เฉพาะ status (เผื่อ client เก่ายังเรียก)

// assignees + comments
router.put('/tasks/:id/assignees', TaskController.setAssignees);
router.post('/tasks/:id/comments', TaskController.comment);

// delete
router.delete('/tasks/:id', TaskController.remove);

export default router;
