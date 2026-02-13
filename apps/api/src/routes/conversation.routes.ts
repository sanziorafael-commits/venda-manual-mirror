import { UserRole } from '@prisma/client';
import { Router } from 'express';

import {
  conversationWebhookHandler,
  getConversationByIdHandler,
  listConversationsHandler,
} from '../controllers/conversation.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/webhook', conversationWebhookHandler);
router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR));
router.get('/', listConversationsHandler);
router.get('/:conversationId', getConversationByIdHandler);

export default router;
