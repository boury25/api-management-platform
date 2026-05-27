import { Router } from 'express';
import { projectController } from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { createProjectValidator, updateProjectValidator, projectIdValidator } from '../validators/project.validator';

const router = Router();

router.use(authenticate);

router.post('/', validate(createProjectValidator), projectController.create);
router.get('/', projectController.list);
router.get('/:projectId', validate(projectIdValidator), projectController.getById);
router.put('/:projectId', validate([...projectIdValidator, ...updateProjectValidator]), projectController.update);
router.delete('/:projectId', validate(projectIdValidator), projectController.delete);

export default router;
