import { Router } from 'express';

import {
  deleteLocatedClientHandler,
  getLocatedClientByIdHandler,
  listLocatedClientsHandler,
  locatedClientWebhookHandler,
  updateLocatedClientStatusHandler,
} from '../controllers/located-client.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { authenticateWebhook } from '../middlewares/webhook-auth.middleware.js';
import {
  LOCATED_CLIENT_MUTATION_ROLES,
  LOCATED_CLIENT_READ_ROLES,
} from '../utils/role-capabilities.js';

const router = Router();

router.post('/webhook', authenticateWebhook, locatedClientWebhookHandler);

router.use(authenticate);
router.use(authorize(...LOCATED_CLIENT_READ_ROLES));

router.get('/', listLocatedClientsHandler);
router.get('/:located_client_id', getLocatedClientByIdHandler);
router.patch(
  '/:located_client_id/status',
  authorize(...LOCATED_CLIENT_MUTATION_ROLES),
  updateLocatedClientStatusHandler,
);
router.delete(
  '/:located_client_id',
  authorize(...LOCATED_CLIENT_MUTATION_ROLES),
  deleteLocatedClientHandler,
);

export default router;


