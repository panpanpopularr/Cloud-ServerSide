// api/src/routes/project.routes.js
import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.js';
import * as ProjectController from '../controllers/project.controller.js';
import * as ChatController from '../controllers/chat.controller.js';

const router = Router();

// Projects
router.get('/projects', ensureAuth, ProjectController.list);
router.get('/projects/:id', ensureAuth, ProjectController.getOne);
router.get('/projects/:id/members', ensureAuth, ProjectController.members);
router.post('/projects', ensureAuth, ProjectController.create);
router.delete('/projects/:id', ensureAuth, ProjectController.remove);

// Chat (ใช้ชื่อ create ให้ตรงกับ controller)
router.get('/projects/:id/chat', ensureAuth, ChatController.list);
router.post('/projects/:id/chat', ensureAuth, ChatController.create);

export default router;
