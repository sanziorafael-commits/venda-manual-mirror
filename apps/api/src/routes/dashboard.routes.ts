import { Router } from 'express';

import {
  dashboardFilterOptionsHandler,
  dashboardInteractionsSeriesHandler,
  dashboardOverviewHandler,
} from '../controllers/dashboard.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { DASHBOARD_OVERVIEW_ROLES } from '../utils/role-capabilities.js';

const router = Router();

router.use(authenticate);
router.use(authorize(...DASHBOARD_OVERVIEW_ROLES));

router.get('/overview', dashboardOverviewHandler);
router.get('/interactions-series', dashboardInteractionsSeriesHandler);
router.get('/filter-options', dashboardFilterOptionsHandler);

export default router;


