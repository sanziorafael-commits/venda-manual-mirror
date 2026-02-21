import { UserRole } from '@prisma/client';
import { Router } from 'express';

import {
  deleteLocatedClientHandler,
  getLocatedClientByIdHandler,
  listLocatedClientsHandler,
  locatedClientWebhookHandler,
  updateLocatedClientStatusHandler,
} from '../controllers/located-client.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/webhook', locatedClientWebhookHandler);

router.use(authenticate);
router.use(
  authorize(UserRole.ADMIN, UserRole.DIRETOR, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR),
);

router.get('/', listLocatedClientsHandler);
router.get('/:located_client_id', getLocatedClientByIdHandler);
router.patch(
  '/:located_client_id/status',
  authorize(UserRole.DIRETOR, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR),
  updateLocatedClientStatusHandler,
);
router.delete(
  '/:located_client_id',
  authorize(UserRole.DIRETOR, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR),
  deleteLocatedClientHandler,
);

export default router;


