import { Router } from 'express';
import { ensureAuth } from '../middlewares/auth.js';
import { MemberController } from '../controllers/member.controller.js';

const router = Router();

router.get('/projects/:projectId/members', ensureAuth, MemberController.list);
router.post('/projects/:projectId/invite', ensureAuth, MemberController.invite);

export default router;
