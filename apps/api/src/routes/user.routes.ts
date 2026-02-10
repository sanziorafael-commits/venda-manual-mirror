import { UserRole } from '@prisma/client';
import { Router } from 'express';

import {
  createUserHandler,
  deleteUserHandler,
  getUserByIdHandler,
  listUsersHandler,
  reassignManagerTeamHandler,
  reassignSupervisorHandler,
  updateUserHandler,
} from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR));

router.post(
  '/actions/reassign-supervisor',
  authorize(UserRole.ADMIN, UserRole.GERENTE_COMERCIAL),
  reassignSupervisorHandler,
);
router.post('/actions/reassign-manager-team', authorize(UserRole.ADMIN), reassignManagerTeamHandler);

// Compatibilidade temporaria para clientes legados.
router.post('/reassign-supervisor', authorize(UserRole.ADMIN, UserRole.GERENTE_COMERCIAL), reassignSupervisorHandler);
router.post('/reassign-manager-team', authorize(UserRole.ADMIN), reassignManagerTeamHandler);

router.get('/', listUsersHandler);
router.get('/:userId', getUserByIdHandler);
router.post('/', createUserHandler);
router.patch('/:userId', updateUserHandler);
router.delete('/:userId', deleteUserHandler);

export default router;
