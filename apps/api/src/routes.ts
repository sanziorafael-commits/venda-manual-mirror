import { Router } from 'express';

import healthRoutes from './routes/health.routes.js';

const router = Router();

router.use('/health', healthRoutes);

export default router;
