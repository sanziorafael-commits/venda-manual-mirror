import { Router } from 'express';

import { createUploadSignedUrlHandler } from '../controllers/upload.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { PRODUCT_UPLOAD_ROLES } from '../utils/role-capabilities.js';

const router = Router();

router.use(authenticate);
router.use(authorize(...PRODUCT_UPLOAD_ROLES));

router.post('/signed-url', createUploadSignedUrlHandler);

export default router;


