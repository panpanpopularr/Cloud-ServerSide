// api/src/routes/project.routes.js
import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.js';
import * as ProjectController from '../controllers/project.controller.js';

const router = Router();

// ทั้งหมดต้องล็อกอินก่อน
router.get('/projects', ensureAuth, ProjectController.list);
router.post('/projects', ensureAuth, ProjectController.create);
router.delete('/projects/:id', ensureAuth, ProjectController.remove);

export default router;
