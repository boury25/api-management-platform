import { Router } from 'express';
import { rateLimitController } from '../controllers/rateLimit.controller';
import { authenticate } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();

router.use(authenticate);

const rateLimitValidator = [
  body('perMinute').optional().isInt({ min: 1, max: 10000 }).withMessage('perMinute must be 1–10000'),
  body('perHour').optional().isInt({ min: 1, max: 100000 }).withMessage('perHour must be 1–100000'),
  body('perDay').optional().isInt({ min: 1, max: 1000000 }).withMessage('perDay must be 1–1000000'),
];

router.get('/project/:projectId', rateLimitController.getRule);
router.put('/project/:projectId', validate(rateLimitValidator), rateLimitController.upsertRule);
router.delete('/project/:projectId', rateLimitController.deleteRule);

export default router;
