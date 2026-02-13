import type { DashboardOverview, DashboardSeries } from "@/schemas/dashboard";

export type OverviewRankingItem =
  DashboardOverview["userRanking"]["highestVolume"][number];
export type OverviewProductItem =
  DashboardOverview["productRanking"]["mostCited"][number];
export type OverviewSeriesPoint = DashboardSeries["points"][number];

