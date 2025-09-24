import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller.js';
const router = Router();
router.get('/projects/:projectId/activity', ActivityController.listByProject);
export default router;
