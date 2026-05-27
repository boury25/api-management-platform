import { body, param } from 'express-validator';

export const createApiKeyValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('API key name must be between 2 and 100 characters'),
  body('projectId').isUUID().withMessage('Invalid project ID'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid ISO 8601 date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Expiry date must be in the future');
      }
      return true;
    }),
];

export const apiKeyIdValidator = [
  param('keyId').isUUID().withMessage('Invalid API key ID'),
];

export const rotateApiKeyValidator = [
  param('keyId').isUUID().withMessage('Invalid API key ID'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expiry date must be a valid ISO 8601 date'),
];
