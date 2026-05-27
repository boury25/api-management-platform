import { body, param } from 'express-validator';

export const createWebhookValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Webhook name must be between 2 and 100 characters'),
  body('url')
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Webhook URL must be a valid HTTP/HTTPS URL'),
  body('eventType')
    .isIn(['API_KEY_USED', 'RATE_LIMIT_EXCEEDED', 'GATEWAY_REQUEST_FAILED', 'MOCK_ENDPOINT_CALLED'])
    .withMessage('Invalid event type'),
];

export const webhookIdValidator = [
  param('webhookId').isUUID().withMessage('Invalid webhook ID'),
];
