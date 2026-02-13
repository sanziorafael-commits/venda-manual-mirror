import type { Request, Response } from 'express';

import {
  dashboardFilterOptionsQuerySchema,
  dashboardInteractionsSeriesQuerySchema,
  dashboardOverviewQuerySchema,
} from '../schemas/dashboard.schema.js';
import {
  getDashboardFilterOptions,
  getDashboardInteractionsSeries,
  getDashboardOverview,
} from '../services/dashboard.service.js';
import { getAuthUserOrThrow } from '../utils/auth-user.js';

export async function dashboardOverviewHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const query = dashboardOverviewQuerySchema.parse(req.query);
  const data = await getDashboardOverview(authUser, query);

  res.status(200).json({ data });
}

export async function dashboardInteractionsSeriesHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const query = dashboardInteractionsSeriesQuerySchema.parse(req.query);
  const data = await getDashboardInteractionsSeries(authUser, query);

  res.status(200).json({ data });
}

export async function dashboardFilterOptionsHandler(req: Request, res: Response) {
  const authUser = getAuthUserOrThrow(req);
  const query = dashboardFilterOptionsQuerySchema.parse(req.query);
  const data = await getDashboardFilterOptions(authUser, query);

  res.status(200).json({ data });
}
