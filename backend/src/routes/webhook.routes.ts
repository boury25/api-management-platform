import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { createWebhookValidator, webhookIdValidator } from '../validators/webhook.validator';

const router = Router();
router.use(authenticate);

router.post('/project/:projectId', validate(createWebhookValidator), webhookController.create);
router.get('/project/:projectId', webhookController.list);
router.put('/:webhookId', validate(webhookIdValidator), webhookController.update);
router.delete('/:webhookId', validate(webhookIdValidator), webhookController.delete);
router.get('/:webhookId/deliveries', validate(webhookIdValidator), webhookController.deliveryLogs);

export default router;
