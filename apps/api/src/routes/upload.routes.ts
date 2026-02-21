import { UserRole } from '@prisma/client';
import { Router } from 'express';

import { createUploadSignedUrlHandler } from '../controllers/upload.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(
  authorize(UserRole.ADMIN, UserRole.DIRETOR, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR),
);

router.post('/signed-url', createUploadSignedUrlHandler);

export default router;


