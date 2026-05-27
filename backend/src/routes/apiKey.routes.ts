import { Router } from 'express';
import { apiKeyController } from '../controllers/apiKey.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { createApiKeyValidator, apiKeyIdValidator, rotateApiKeyValidator } from '../validators/apiKey.validator';

const router = Router();

router.use(authenticate);

// List API keys for a project
router.get('/project/:projectId', apiKeyController.list);

// Create new API key
router.post('/', validate(createApiKeyValidator), apiKeyController.create);

// Revoke API key
router.patch('/:keyId/revoke', validate(apiKeyIdValidator), apiKeyController.revoke);

// Rotate API key (revoke old, create new)
router.post('/:keyId/rotate', validate(rotateApiKeyValidator), apiKeyController.rotate);

// Delete API key permanently
router.delete('/:keyId', validate(apiKeyIdValidator), apiKeyController.delete);

export default router;
