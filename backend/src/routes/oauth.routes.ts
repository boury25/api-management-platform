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
  // Use a custom validator instead of body('redirectUrls.*').isURL() — in
  // express-validator v7 the bare wildcard form can throw when the array is
  // absent or empty, producing an unhandled exception that becomes a 500.
  body('redirectUrls')
    .optional()
    .custom((urls: unknown) => {
      if (!Array.isArray(urls)) return true; // already caught above
      for (const url of urls) {
        if (typeof url !== 'string' || !/^https?:\/\/.+/.test(url)) {
          throw new Error(`"${url}" is not a valid URL`);
        }
      }
      return true;
    })
    .withMessage('Each redirect URL must be a valid http/https URL'),
  body('scopes').optional().isArray().withMessage('scopes must be an array'),
];

router.post('/project/:projectId', validate(createClientValidator), oauthController.create);
router.get('/project/:projectId', oauthController.list);
router.patch('/:clientId/revoke', oauthController.revoke);
router.delete('/:clientId', oauthController.delete);

export default router;
