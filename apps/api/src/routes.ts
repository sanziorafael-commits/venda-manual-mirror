import { Router } from 'express';

import authRoutes from './routes/auth.routes.js';
import companyRoutes from './routes/company.routes.js';
import healthRoutes from './routes/health.routes.js';
import meRoutes from './routes/me.routes.js';
import userRoutes from './routes/user.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/companies', companyRoutes);
router.use('/users', userRoutes);

export default router;
