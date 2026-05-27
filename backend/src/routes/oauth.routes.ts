import { Router } from 'express';
import { oauthController } from '../controllers/oauth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

const createClientValidator = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('redirectUrls').optional().isArray().withMessage('redirectUrls must be an array'),
  body('redirectUrls.*').isURL().withMessage('Each redirect URL must be valid'),
  body('scopes').optional().isArray().withMessage('scopes must be an array'),
];

router.post('/project/:projectId', validate(createClientValidator), oauthController.create);
router.get('/project/:projectId', oauthController.list);
router.patch('/:clientId/revoke', oauthController.revoke);
router.delete('/:clientId', oauthController.delete);

export default router;
