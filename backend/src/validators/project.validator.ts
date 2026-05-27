import { body, param } from 'express-validator';

export const createProjectValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Project name must be between 2 and 100 characters'),
  body('baseUrl')
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Base URL must be a valid HTTP/HTTPS URL'),
  body('environment')
    .isIn(['PRODUCTION', 'STAGING', 'DEVELOPMENT'])
    .withMessage('Environment must be PRODUCTION, STAGING, or DEVELOPMENT'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
];

export const updateProjectValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Project name must be between 2 and 100 characters'),
  body('baseUrl')
    .optional()
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Base URL must be a valid HTTP/HTTPS URL'),
  body('environment')
    .optional()
    .isIn(['PRODUCTION', 'STAGING', 'DEVELOPMENT'])
    .withMessage('Invalid environment'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
];

export const projectIdValidator = [
  param('projectId').isUUID().withMessage('Invalid project ID'),
];
