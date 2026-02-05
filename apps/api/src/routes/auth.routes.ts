import { UserRole } from '@prisma/client';
import { Router } from 'express';

import {
  activateAccountHandler,
  bootstrapAdminHandler,
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  resetPasswordHandler,
  resendActivationHandler,
} from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/bootstrap-admin', bootstrapAdminHandler);
router.post('/login', loginHandler);
router.post('/refresh', refreshHandler);
router.post('/logout', logoutHandler);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);
router.post('/activate-account', activateAccountHandler);
router.post(
  '/resend-activation',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR),
  resendActivationHandler,
);

export default router;
