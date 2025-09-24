import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
const router = Router();

router.post('/projects', ProjectController.create);
router.get('/projects', ProjectController.list);
router.delete('/projects/:id', ProjectController.remove);

export default router;
