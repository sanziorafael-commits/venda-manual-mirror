import { z } from 'zod';

const dashboardPeriodSchema = z.enum(['today', '7d', '30d', '365d']);
const dashboardViewBySchema = z.enum(['vendedor', 'supervisor']);
const dashboardScopeSchema = z.enum(['all', 'vendors', 'supervisors']);
const dateQuerySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dashboardOverviewQuerySchema = z.object({
  period: dashboardPeriodSchema.default('365d'),
  start_date: dateQuerySchema.optional(),
  end_date: dateQuerySchema.optional(),
  view_by: dashboardViewBySchema.optional(),
  scope: dashboardScopeSchema.optional(),
  company_id: z.string().uuid().optional(),
  rank_limit: z.coerce.number().int().positive().max(20).default(3),
});

export const dashboardInteractionsSeriesQuerySchema = z.object({
  period: dashboardPeriodSchema.default('365d'),
  start_date: dateQuerySchema.optional(),
  end_date: dateQuerySchema.optional(),
  view_by: dashboardViewBySchema.optional(),
  scope: dashboardScopeSchema.optional(),
  company_id: z.string().uuid().optional(),
});

export const dashboardFilterOptionsQuerySchema = z.object({
  company_id: z.string().uuid().optional(),
});

export type DashboardOverviewQueryInput = z.infer<typeof dashboardOverviewQuerySchema>;
export type DashboardInteractionsSeriesQueryInput = z.infer<
  typeof dashboardInteractionsSeriesQuerySchema
>;
export type DashboardFilterOptionsQueryInput = z.infer<typeof dashboardFilterOptionsQuerySchema>;


