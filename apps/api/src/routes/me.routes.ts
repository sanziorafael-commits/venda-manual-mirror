import { Router } from 'express';

import { getMeHandler, updateMeHandler } from '../controllers/me.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getMeHandler);
router.patch('/', updateMeHandler);

export default router;
