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
import {
  MASS_REASSIGN_MANAGER_TEAM_ROLES,
  MASS_REASSIGN_SUPERVISOR_ROLES,
  USERS_MODULE_ROLES,
} from '../utils/role-capabilities.js';

const router = Router();

router.use(authenticate);
router.use(authorize(...USERS_MODULE_ROLES));

router.post(
  '/actions/reassign-supervisor',
  authorize(...MASS_REASSIGN_SUPERVISOR_ROLES),
  reassignSupervisorHandler,
);
router.post(
  '/actions/reassign-manager-team',
  authorize(...MASS_REASSIGN_MANAGER_TEAM_ROLES),
  reassignManagerTeamHandler,
);

// Compatibilidade temporaria para clientes legados.
router.post(
  '/reassign-supervisor',
  authorize(...MASS_REASSIGN_SUPERVISOR_ROLES),
  reassignSupervisorHandler,
);
router.post(
  '/reassign-manager-team',
  authorize(...MASS_REASSIGN_MANAGER_TEAM_ROLES),
  reassignManagerTeamHandler,
);

router.get('/', listUsersHandler);
router.get('/:user_id', getUserByIdHandler);
router.post('/', createUserHandler);
router.patch('/:user_id', updateUserHandler);
router.delete('/:user_id', deleteUserHandler);

export default router;


