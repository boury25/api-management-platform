import { Router } from 'express';
import { logController } from '../controllers/log.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/project/:projectId', logController.list);
router.get('/project/:projectId/analytics', logController.getAnalytics);

export default router;
