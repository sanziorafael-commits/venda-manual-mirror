import { Router } from 'express';

import authRoutes from './routes/auth.routes.js';
import companyRoutes from './routes/company.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import healthRoutes from './routes/health.routes.js';
import locatedClientRoutes from './routes/located-client.routes.js';
import meRoutes from './routes/me.routes.js';
import productRoutes from './routes/product.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import userRoutes from './routes/user.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/me', meRoutes);
router.use('/companies', companyRoutes);
router.use('/users', userRoutes);
router.use('/uploads', uploadRoutes);
router.use('/conversations', conversationRoutes);
router.use('/located-clients', locatedClientRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/products', productRoutes);

export default router;


