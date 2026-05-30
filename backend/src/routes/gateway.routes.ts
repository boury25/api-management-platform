import { Router } from 'express';
import { gatewayController } from '../controllers/gateway.controller';

const router = Router();

/**
 * Catch-all proxy route
 * GET/POST/PUT/PATCH/DELETE /api/gateway/:projectId/path/to/resource
 * Forwards request to project.baseUrl/path/to/resource
 *
 * The wildcard uses Express 4.x "0 or more path segments" syntax.
 */
// Match /:projectId with any path after it
// Note: Express 4 + path-to-regexp 0.1.x uses unnamed wildcard (*); the captured
// segment is available as req.params[0] in the controller.
router.all('/:projectId/*', gatewayController.proxy);

export default router;
