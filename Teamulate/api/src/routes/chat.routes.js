// api/src/routes/chat.routes.js
import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.js';
import * as ChatController from '../controllers/chat.controller.js';

const router = Router();

router.get('/projects/:id/chat', ensureAuth, ChatController.list);
router.post('/projects/:id/chat', ensureAuth, ChatController.create);

export default router;
