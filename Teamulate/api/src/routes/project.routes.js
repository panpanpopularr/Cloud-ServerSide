import { Router } from 'express';
import * as ProjectController from '../controllers/project.controller.js';

const router = Router();

router.get('/projects', ProjectController.list);
router.post('/projects', ProjectController.create);
router.delete('/projects/:id', ProjectController.remove);

export default router;
