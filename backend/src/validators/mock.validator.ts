import { body, param } from 'express-validator';

export const createMockEndpointValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('method')
    .isIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])
    .withMessage('Invalid HTTP method'),
  body('path')
    .trim()
    .matches(/^\//)
    .withMessage('Path must start with /')
    .isLength({ min: 1, max: 255 })
    .withMessage('Path too long'),
  body('responseBody').notEmpty().withMessage('Response body is required'),
  body('statusCode')
    .isInt({ min: 100, max: 599 })
    .withMessage('Status code must be between 100 and 599'),
  body('delay')
    .optional()
    .isInt({ min: 0, max: 30000 })
    .withMessage('Delay must be between 0 and 30000ms'),
];

export const mockEndpointIdValidator = [
  param('endpointId').isUUID().withMessage('Invalid endpoint ID'),
];
