import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { env } from '../config/env.js';
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
import { createIpRateLimit } from '../middlewares/rate-limit.middleware.js';

const router = Router();

const bootstrapAdminRateLimit = createIpRateLimit({
  keyPrefix: 'auth:bootstrap-admin',
  windowMs: env.AUTH_BOOTSTRAP_ADMIN_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_BOOTSTRAP_ADMIN_RATE_LIMIT_MAX,
  message: 'Muitas tentativas de bootstrap admin. Aguarde e tente novamente.',
});

const loginRateLimit = createIpRateLimit({
  keyPrefix: 'auth:login',
  windowMs: env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_LOGIN_RATE_LIMIT_MAX,
  message: 'Muitas tentativas de login. Aguarde e tente novamente.',
});

const forgotPasswordRateLimit = createIpRateLimit({
  keyPrefix: 'auth:forgot-password',
  windowMs: env.AUTH_FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_FORGOT_PASSWORD_RATE_LIMIT_MAX,
  message: 'Muitas solicitacoes de recuperacao de senha. Aguarde e tente novamente.',
});

router.post('/bootstrap-admin', bootstrapAdminRateLimit, bootstrapAdminHandler);
router.post('/login', loginRateLimit, loginHandler);
router.post('/refresh', refreshHandler);
router.post('/logout', logoutHandler);
router.post('/forgot-password', forgotPasswordRateLimit, forgotPasswordHandler);
router.post('/reset-password', resetPasswordHandler);
router.post('/activate-account', activateAccountHandler);
router.post(
  '/resend-activation',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.DIRETOR, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR),
  resendActivationHandler,
);

export default router;


