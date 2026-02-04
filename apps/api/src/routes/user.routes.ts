import { UserRole } from '@prisma/client';
import { Router } from 'express';

import {
  createUserHandler,
  deleteUserHandler,
  getUserByIdHandler,
  listUsersHandler,
  updateUserHandler,
} from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR));

router.get('/', listUsersHandler);
router.get('/:userId', getUserByIdHandler);
router.post('/', createUserHandler);
router.patch('/:userId', updateUserHandler);
router.delete('/:userId', deleteUserHandler);

export default router;
