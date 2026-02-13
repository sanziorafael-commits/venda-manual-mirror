import { z } from "zod";

export const dashboardScopeSchema = z.enum(["all", "vendors", "supervisors"]);
export const dashboardPeriodSchema = z.enum(["today", "7d", "30d", "365d"]);

export const dashboardOptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

export const dashboardTeamSummarySchema = z.object({
  supervisors: z.number().int().nonnegative(),
  vendors: z.number().int().nonnegative(),
});

export const dashboardFilterOptionsSchema = z.object({
  role: z.enum(["ADMIN", "GERENTE_COMERCIAL", "SUPERVISOR"]),
  periodOptions: z.array(dashboardOptionSchema),
  scopeOptions: z.array(dashboardOptionSchema),
  viewByOptions: z.array(dashboardOptionSchema),
  companyOptions: z.array(dashboardOptionSchema),
  defaults: z.object({
    period: dashboardPeriodSchema,
    scope: dashboardScopeSchema,
    viewBy: z.enum(["vendedor", "supervisor"]),
    companyId: z.string().nullable(),
  }),
  teamSummary: dashboardTeamSummarySchema,
});

export const dashboardFilterOptionsApiResponseSchema = z.object({
  data: dashboardFilterOptionsSchema,
});

export const dashboardRankingItemSchema = z.object({
  userName: z.string().min(1),
  userPhone: z.string().nullable(),
  interactions: z.number().int().nonnegative(),
});

export const dashboardProductRankingItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  citations: z.number().int().nonnegative(),
});

export const dashboardOverviewSchema = z.object({
  period: dashboardPeriodSchema,
  scope: dashboardScopeSchema,
  viewBy: z.enum(["vendedor", "supervisor"]),
  startAt: z.string(),
  endAt: z.string(),
  company: z
    .object({
      id: z.string().min(1),
      name: z.string().min(1),
    })
    .nullable(),
  totalInteractions: z.number().int().nonnegative(),
  adoptionRate: z.object({
    entityType: z.string().min(1),
    activeEntities: z.number().int().nonnegative(),
    activeVendors: z.number().int().nonnegative(),
    activeWithInteractions: z.number().int().nonnegative(),
    ratePercent: z.number().int().nonnegative(),
  }),
  adoptionRateByScope: z.object({
    vendors: z.object({
      activeEntities: z.number().int().nonnegative(),
      activeWithInteractions: z.number().int().nonnegative(),
      ratePercent: z.number().int().nonnegative(),
    }),
    supervisors: z
      .object({
        activeEntities: z.number().int().nonnegative(),
        activeWithInteractions: z.number().int().nonnegative(),
        ratePercent: z.number().int().nonnegative(),
      })
      .nullable(),
  }),
  vendorRanking: z.object({
    highestVolume: z.array(dashboardRankingItemSchema),
    lowestVolume: z.array(dashboardRankingItemSchema),
  }),
  userRanking: z.object({
    highestVolume: z.array(dashboardRankingItemSchema),
    lowestVolume: z.array(dashboardRankingItemSchema),
  }),
  rankingsByScope: z.object({
    vendors: z.object({
      highestVolume: z.array(dashboardRankingItemSchema),
      lowestVolume: z.array(dashboardRankingItemSchema),
    }),
    supervisors: z
      .object({
        highestVolume: z.array(dashboardRankingItemSchema),
        lowestVolume: z.array(dashboardRankingItemSchema),
      })
      .nullable(),
  }),
  newLocatedClients: z.number().int().nonnegative(),
  productRanking: z.object({
    mostCited: z.array(dashboardProductRankingItemSchema),
    leastCited: z.array(dashboardProductRankingItemSchema),
  }),
});

export const dashboardOverviewApiResponseSchema = z.object({
  data: dashboardOverviewSchema,
});

export const dashboardSeriesPointSchema = z.object({
  bucketStart: z.string(),
  label: z.string().min(1),
  interactions: z.number().int().nonnegative(),
});

export const dashboardSeriesSchema = z.object({
  period: dashboardPeriodSchema,
  scope: dashboardScopeSchema,
  viewBy: z.enum(["vendedor", "supervisor"]),
  granularity: z.enum(["hour", "day", "month"]),
  startAt: z.string(),
  endAt: z.string(),
  companyId: z.string().nullable(),
  totalInteractions: z.number().int().nonnegative(),
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
