export type DashboardPeriod = 'today' | '7d' | '30d' | '365d';
export type DashboardViewBy = 'vendedor' | 'supervisor';
export type DashboardScope = 'all' | 'vendors' | 'supervisors';

export type DashboardOverviewInput = {
  period?: DashboardPeriod;
  start_date?: string;
  end_date?: string;
  company_id?: string;
  rank_limit?: number;
  view_by?: DashboardViewBy;
  scope?: DashboardScope;
};

export type DashboardInteractionsSeriesInput = {
  period?: DashboardPeriod;
  start_date?: string;
  end_date?: string;
  company_id?: string;
  view_by?: DashboardViewBy;
  scope?: DashboardScope;
};

export type DashboardFilterOptionsInput = {
  company_id?: string;
};

export type DashboardRankingItem = {
  user_name: string;
  user_phone: string | null;
  interactions: number;
};

export type DashboardProductRankingItem = {
  product_id: string;
  product_name: string;
  citations: number;
};

export type DashboardFilterOption<T extends string = string> = {
  value: T;
  label: string;
};


