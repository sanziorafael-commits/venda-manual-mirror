import { z } from "zod";

export const dashboardScopeSchema = z.enum(["all", "vendors", "supervisors"]);
export const dashboardPeriodSchema = z.enum(["today", "7d", "30d", "365d"]);

export const dashboardOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  logo_signed_url: z.string().url().nullable().optional(),
});

export const dashboardTeamSummarySchema = z.object({
  supervisors: z.number().int().nonnegative(),
  vendors: z.number().int().nonnegative(),
});

export const dashboardFilterOptionsSchema = z.object({
  role: z.enum(["ADMIN", "DIRETOR", "GERENTE_COMERCIAL", "SUPERVISOR"]),
  period_options: z.array(dashboardOptionSchema),
  scope_options: z.array(dashboardOptionSchema),
  view_by_options: z.array(dashboardOptionSchema),
  company_options: z.array(dashboardOptionSchema),
  defaults: z.object({
    period: dashboardPeriodSchema,
    scope: dashboardScopeSchema,
    view_by: z.enum(["vendedor", "supervisor"]),
    company_id: z.string().nullable(),
  }),
  team_summary: dashboardTeamSummarySchema,
});

export const dashboardFilterOptionsApiResponseSchema = z.object({
  data: dashboardFilterOptionsSchema,
});

export const dashboardRankingItemSchema = z.object({
  user_name: z.string().min(1),
  user_phone: z.string().nullable(),
  interactions: z.number().int().nonnegative(),
});

export const dashboardProductRankingItemSchema = z.object({
  product_id: z.string().min(1),
  product_name: z.string().min(1),
  citations: z.number().int().nonnegative(),
});

export const dashboardOverviewSchema = z.object({
  period: dashboardPeriodSchema,
  scope: dashboardScopeSchema,
  view_by: z.enum(["vendedor", "supervisor"]),
  start_at: z.string(),
  end_at: z.string(),
  company: z
    .object({
      id: z.string().min(1),
      name: z.string().min(1),
    })
    .nullable(),
  total_interactions: z.number().int().nonnegative(),
  adoption_rate: z.object({
    entity_type: z.string().min(1),
    active_entities: z.number().int().nonnegative(),
    active_vendors: z.number().int().nonnegative(),
    active_with_interactions: z.number().int().nonnegative(),
    rate_percent: z.number().int().nonnegative(),
  }),
  adoption_rate_by_scope: z.object({
    vendors: z.object({
      active_entities: z.number().int().nonnegative(),
      active_with_interactions: z.number().int().nonnegative(),
      rate_percent: z.number().int().nonnegative(),
    }),
    supervisors: z
      .object({
        active_entities: z.number().int().nonnegative(),
        active_with_interactions: z.number().int().nonnegative(),
        rate_percent: z.number().int().nonnegative(),
      })
      .nullable(),
  }),
  vendor_ranking: z.object({
    highest_volume: z.array(dashboardRankingItemSchema),
    lowest_volume: z.array(dashboardRankingItemSchema),
  }),
  user_ranking: z.object({
    highest_volume: z.array(dashboardRankingItemSchema),
    lowest_volume: z.array(dashboardRankingItemSchema),
  }),
  rankings_by_scope: z.object({
    vendors: z.object({
      highest_volume: z.array(dashboardRankingItemSchema),
      lowest_volume: z.array(dashboardRankingItemSchema),
    }),
    supervisors: z
      .object({
        highest_volume: z.array(dashboardRankingItemSchema),
        lowest_volume: z.array(dashboardRankingItemSchema),
      })
      .nullable(),
  }),
  new_located_clients: z.number().int().nonnegative(),
  product_ranking: z.object({
    most_cited: z.array(dashboardProductRankingItemSchema),
    least_cited: z.array(dashboardProductRankingItemSchema),
  }),
});

export const dashboardOverviewApiResponseSchema = z.object({
  data: dashboardOverviewSchema,
});

export const dashboardSeriesPointSchema = z.object({
  bucket_start: z.string(),
  label: z.string().min(1),
  interactions: z.number().int().nonnegative(),
});

export const dashboardSeriesSchema = z.object({
  period: dashboardPeriodSchema,
  scope: dashboardScopeSchema,
  view_by: z.enum(["vendedor", "supervisor"]),
  granularity: z.enum(["hour", "day", "month"]),
  start_at: z.string(),
  end_at: z.string(),
  company_id: z.string().nullable(),
  total_interactions: z.number().int().nonnegative(),
  points: z.array(dashboardSeriesPointSchema),
});

export const dashboardSeriesApiResponseSchema = z.object({
  data: dashboardSeriesSchema,
});

export type DashboardScope = z.infer<typeof dashboardScopeSchema>;
export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;
export type DashboardFilterOptions = z.infer<typeof dashboardFilterOptionsSchema>;
export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;
export type DashboardSeries = z.infer<typeof dashboardSeriesSchema>;

