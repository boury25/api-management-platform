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
router.all('/:projectId/*path', gatewayController.proxy);

export default router;
