import { Router } from 'express';

import {
  deleteConversationHandler,
  conversationWebhookHandler,
  getConversationByIdHandler,
  listConversationsHandler,
} from '../controllers/conversation.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { authenticateWebhook } from '../middlewares/webhook-auth.middleware.js';
import {
  CONVERSATION_DELETE_ROLES,
  CONVERSATION_READ_ROLES,
} from '../utils/role-capabilities.js';

const router = Router();

router.post('/webhook', authenticateWebhook, conversationWebhookHandler);
router.use(authenticate);
router.use(authorize(...CONVERSATION_READ_ROLES));
router.get('/', listConversationsHandler);
router.get('/:conversation_id', getConversationByIdHandler);
router.use(authorize(...CONVERSATION_DELETE_ROLES));
router.delete('/:conversation_id', deleteConversationHandler);

export default router;


