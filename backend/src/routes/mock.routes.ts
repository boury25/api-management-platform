import { Router } from 'express';
import { mockController } from '../controllers/mock.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { createMockEndpointValidator, mockEndpointIdValidator } from '../validators/mock.validator';

const router = Router();

// Public mock serving routes (no auth needed — API key optional)
// Wildcard: /api/mocks/serve/:projectId/path/to/resource
router.all('/serve/:projectId/*path', mockController.serve);

// Management routes (auth required)
router.post('/project/:projectId', authenticate, validate(createMockEndpointValidator), mockController.create);
router.get('/project/:projectId', authenticate, mockController.list);
router.put('/:endpointId', authenticate, validate(mockEndpointIdValidator), mockController.update);
router.delete('/:endpointId', authenticate, validate(mockEndpointIdValidator), mockController.delete);

export default router;
