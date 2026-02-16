export type DashboardPeriod = 'today' | '7d' | '30d' | '365d';
export type DashboardViewBy = 'vendedor' | 'supervisor';
export type DashboardScope = 'all' | 'vendors' | 'supervisors';

export type DashboardOverviewInput = {
  period?: DashboardPeriod;
  startDate?: string;
  endDate?: string;
  companyId?: string;
  rankLimit?: number;
  viewBy?: DashboardViewBy;
  scope?: DashboardScope;
};

export type DashboardInteractionsSeriesInput = {
  period?: DashboardPeriod;
  startDate?: string;
  endDate?: string;
  companyId?: string;
  viewBy?: DashboardViewBy;
  scope?: DashboardScope;
};

export type DashboardFilterOptionsInput = {
  companyId?: string;
};

export type DashboardRankingItem = {
  userName: string;
  userPhone: string | null;
  interactions: number;
};

export type DashboardProductRankingItem = {
  productId: string;
  productName: string;
  citations: number;
};

export type DashboardFilterOption<T extends string = string> = {
  value: T;
  label: string;
};
