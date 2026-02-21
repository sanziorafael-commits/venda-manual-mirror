import type { DashboardOverview, DashboardSeries } from "@/schemas/dashboard";

export type OverviewRankingItem =
  DashboardOverview["user_ranking"]["highest_volume"][number];
export type OverviewProductItem =
  DashboardOverview["product_ranking"]["most_cited"][number];
export type OverviewSeriesPoint = DashboardSeries["points"][number];


