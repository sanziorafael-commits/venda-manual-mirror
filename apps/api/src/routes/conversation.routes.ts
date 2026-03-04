import { UserRole } from '@prisma/client';
import { Router } from 'express';

import {
  conversationWebhookHandler,
  getConversationByIdHandler,
  listConversationsHandler,
} from '../controllers/conversation.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { authenticateWebhook } from '../middlewares/webhook-auth.middleware.js';

const router = Router();

router.post('/webhook', authenticateWebhook, conversationWebhookHandler);
router.use(authenticate);
router.use(
  authorize(UserRole.ADMIN, UserRole.DIRETOR, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR),
);
router.get('/', listConversationsHandler);
router.get('/:conversation_id', getConversationByIdHandler);

export default router;


