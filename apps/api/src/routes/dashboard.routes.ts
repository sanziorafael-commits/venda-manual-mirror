import { UserRole } from '@prisma/client';
import { Router } from 'express';

import {
  dashboardFilterOptionsHandler,
  dashboardInteractionsSeriesHandler,
  dashboardOverviewHandler,
} from '../controllers/dashboard.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN, UserRole.GERENTE_COMERCIAL, UserRole.SUPERVISOR));

router.get('/overview', dashboardOverviewHandler);
router.get('/interactions-series', dashboardInteractionsSeriesHandler);
router.get('/filter-options', dashboardFilterOptionsHandler);

export default router;
