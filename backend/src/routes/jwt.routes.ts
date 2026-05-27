import { Router } from 'express';
import { jwtConfigController } from '../controllers/jwtConfig.controller';
import { authenticate } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

const jwtValidator = [
  body('secret').notEmpty().withMessage('JWT secret is required'),
  body('algorithm')
    .optional()
    .isIn(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512'])
    .withMessage('Invalid algorithm'),
];

router.get('/project/:projectId', jwtConfigController.get);
router.put('/project/:projectId', validate(jwtValidator), jwtConfigController.upsert);
router.delete('/project/:projectId', jwtConfigController.delete);

export default router;
