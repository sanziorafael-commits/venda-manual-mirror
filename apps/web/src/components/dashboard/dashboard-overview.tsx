"use client";

import * as React from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { DateRangePicker } from "@/components/conversations/date-range-picker";
import { useAuthHydrated, useAuthUser } from "@/hooks/use-auth-user";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import {
  dashboardFilterOptionsApiResponseSchema,
  dashboardOverviewApiResponseSchema,
  dashboardSeriesApiResponseSchema,
  type DashboardFilterOptions,
  type DashboardOverview,
  type DashboardPeriod,
  type DashboardScope,
  type DashboardSeries,
} from "@/schemas/dashboard";
import {
  isPlatformAdminContext,
  useSelectedCompanyContext,
} from "@/stores/company-context-store";
import { OverviewAdoptionCard } from "./overview/adoption-card";
import { OverviewLocatedClientsCard } from "./overview/located-clients-card";
import { OverviewProductsCard } from "./overview/products-card";
import { OverviewRankingCard } from "./overview/ranking-card";
import { OverviewTotalInteractionsCard } from "./overview/total-interactions-card";

const PERIOD_ORDER: DashboardPeriod[] = ["365d", "30d", "7d", "today"];

type RankingItem = DashboardOverview["user_ranking"]["highest_volume"][number];

export function DashboardOverviewPanel() {
  const authUser = useAuthUser();
  const authHydrated = useAuthHydrated();
  const isAdmin = authUser?.role === "ADMIN";
  const canSelectScope =
    authUser?.role === "GERENTE_COMERCIAL" || authUser?.role === "DIRETOR";
  const selectedCompanyContext = useSelectedCompanyContext();

  const [isLoadingOptions, setIsLoadingOptions] = React.useState(true);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [filterOptions, setFilterOptions] =
    React.useState<DashboardFilterOptions | null>(null);
  const [period, setPeriod] = React.useState<DashboardPeriod>("365d");
  const [scope, setScope] = React.useState<DashboardScope>("all");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    undefined,
  );
  const [overview, setOverview] = React.useState<DashboardOverview | null>(
    null,
  );
  const [series, setSeries] = React.useState<DashboardSeries | null>(null);

  const optionsRequestRef = React.useRef(0);
  const dashboardRequestRef = React.useRef(0);

  const selectedCompanyId = React.useMemo(() => {
    if (!isAdmin) {
      return authUser?.company_id ?? null;
    }

    if (!selectedCompanyContext) {
      return null;
    }

    if (isPlatformAdminContext(selectedCompanyContext)) {
      return null;
    }

    return selectedCompanyContext;
  }, [authUser?.company_id, isAdmin, selectedCompanyContext]);

  const custom_start_date = React.useMemo(() => {
    if (!dateRange?.from) {
      return null;
    }

    return format(dateRange.from, "yyyy-MM-dd");
  }, [dateRange?.from]);

  const custom_end_date = React.useMemo(() => {
    const endSource = dateRange?.to ?? dateRange?.from;
    if (!endSource) {
      return null;
    }

    return format(endSource, "yyyy-MM-dd");
  }, [dateRange?.from, dateRange?.to]);

  const hasCustomDateRange = Boolean(custom_start_date && custom_end_date);

  const loadFilterOptions = React.useCallback(async () => {
    if (!authHydrated) {
      return;
    }

    const currentRequestId = ++optionsRequestRef.current;
    setIsLoadingOptions(true);

    try {
      const response = await apiFetch<unknown>("/dashboard/filter-options");
      if (currentRequestId !== optionsRequestRef.current) {
        return;
      }

      const parsed =
        dashboardFilterOptionsApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        toast.error("Resposta inesperada ao carregar filtros do dashboard.");
        setFilterOptions(null);
        return;
      }

      const options = parsed.data.data;
      setFilterOptions(options);
      setPeriod(options.defaults.period);
      setScope(options.defaults.scope);
    } catch (error) {
      if (currentRequestId !== optionsRequestRef.current) {
        return;
      }

      toast.error(parseApiError(error));
      setFilterOptions(null);
    } finally {
      if (currentRequestId === optionsRequestRef.current) {
        setIsLoadingOptions(false);
      }
    }
  }, [authHydrated]);

  const loadDashboardData = React.useCallback(async () => {
    if (!authHydrated || !filterOptions) {
      return;
    }

    if (isAdmin && !selectedCompanyId) {
      setOverview(null);
      setSeries(null);
      setIsLoadingData(false);
      return;
    }

    const params = new URLSearchParams();
    params.set("period", period);
    params.set("scope", scope);

    if (custom_start_date) {
      params.set("start_date", custom_start_date);
    }

    if (custom_end_date) {
      params.set("end_date", custom_end_date);
    }

    if (isAdmin && selectedCompanyId) {
      params.set("company_id", selectedCompanyId);
    }

    const query = params.toString();
    const currentRequestId = ++dashboardRequestRef.current;
    setIsLoadingData(true);

    try {
      const [overviewResponse, seriesResponse] = await Promise.all([
        apiFetch<unknown>(`/dashboard/overview?${query}`),
        apiFetch<unknown>(`/dashboard/interactions-series?${query}`),
      ]);

      if (currentRequestId !== dashboardRequestRef.current) {
        return;
      }

      const parsedOverview =
        dashboardOverviewApiResponseSchema.safeParse(overviewResponse);
      const parsedSeries =
        dashboardSeriesApiResponseSchema.safeParse(seriesResponse);

      if (!parsedOverview.success || !parsedSeries.success) {
        toast.error("Resposta inesperada ao carregar dados do dashboard.");
        setOverview(null);
        setSeries(null);
        return;
      }

      setOverview(parsedOverview.data.data);
      setSeries(parsedSeries.data.data);
    } catch (error) {
      if (currentRequestId !== dashboardRequestRef.current) {
        return;
      }

      toast.error(parseApiError(error));
      setOverview(null);
      setSeries(null);
    } finally {
      if (currentRequestId === dashboardRequestRef.current) {
        setIsLoadingData(false);
      }
    }
  }, [
    authHydrated,
    custom_end_date,
    custom_start_date,
    filterOptions,
    isAdmin,
    period,
    scope,
    selectedCompanyId,
  ]);

  React.useEffect(() => {
    void loadFilterOptions();
  }, [loadFilterOptions]);

  React.useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const orderedPeriodOptions = React.useMemo(() => {
    if (!filterOptions) {
      return [];
    }

    const orderIndex = new Map(
      PERIOD_ORDER.map((item, index) => [item, index]),
    );
    return [...filterOptions.period_options].sort((left, right) => {
      const leftIndex = orderIndex.get(left.value as DashboardPeriod) ?? 100;
      const rightIndex = orderIndex.get(right.value as DashboardPeriod) ?? 100;
      return leftIndex - rightIndex;
    });
  }, [filterOptions]);

  const selectedHighestRanking = React.useMemo(() => {
    if (!overview) {
      return [] as RankingItem[];
    }

    return overview.user_ranking.highest_volume;
  }, [overview]);

  const selectedLowestRanking = React.useMemo(() => {
    if (!overview) {
      return [] as RankingItem[];
    }

    return overview.user_ranking.lowest_volume;
  }, [overview]);

  const rankingScopeLabel = React.useMemo(() => {
    if (!overview) {
      return "vendedores";
    }

    if (overview.scope === "supervisors") {
      return "supervisores";
    }

    return "vendedores";
  }, [overview]);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          {canSelectScope ? (
            <label className="text-muted-foreground flex w-full flex-col gap-1.5 text-xs font-medium sm:w-auto sm:min-w-60">
              Escopo
              <select
                value={scope}
                onChange={(event) =>
                  setScope(event.target.value as DashboardScope)
                }
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
                disabled={isLoadingOptions || isLoadingData}
              >
                {filterOptions?.scope_options.map((scopeOption) => (
                  <option key={scopeOption.value} value={scopeOption.value}>
                    {scopeOption.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {orderedPeriodOptions.map((periodOption) => (
            <button
              key={periodOption.value}
              type="button"
              onClick={() => {
                setPeriod(periodOption.value as DashboardPeriod);
                setDateRange(undefined);
              }}
              disabled={isLoadingOptions || isLoadingData}
              className={cn(
                "cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                period === periodOption.value
                  ? "border-[#212a38] bg-[#212a38] text-white"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {periodOption.label}
            </button>
          ))}

          <div className="ml-0 flex w-full flex-wrap items-end gap-2 sm:ml-1 sm:w-auto">
            <div className="flex w-full flex-col gap-1 text-xs font-medium text-muted-foreground sm:w-auto">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                disabled={isLoadingOptions || isLoadingData}
                className="w-full sm:min-w-60"
                placeholder="Selecione o período"
              />
            </div>
            {hasCustomDateRange ? (
              <button
                type="button"
                onClick={() => setDateRange(undefined)}
                disabled={isLoadingOptions || isLoadingData}
                className="w-full cursor-pointer rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:w-auto"
              >
                Limpar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {isLoadingData && !overview ? (
        <DashboardSkeleton />
      ) : overview && series ? (
        <>
          <OverviewTotalInteractionsCard
            total_interactions={overview.total_interactions}
            points={series.points}
            seriesTotal={series.total_interactions}
          />

          <section className="grid gap-4 xl:grid-cols-3">
            <OverviewAdoptionCard
              entityLabel={rankingScopeLabel}
              active_with_interactions={
                overview.adoption_rate.active_with_interactions
              }
              active_entities={overview.adoption_rate.active_entities}
              rate_percent={overview.adoption_rate.rate_percent}
            />

            <OverviewRankingCard
              variant="highest"
              items={selectedHighestRanking}
              emptyMessage="Sem dados para o período."
            />

            <OverviewRankingCard
              variant="lowest"
              items={selectedLowestRanking}
              emptyMessage="Sem dados para o período."
            />

            <OverviewLocatedClientsCard value={overview.new_located_clients} />

            <OverviewProductsCard
              variant="most"
              items={overview.product_ranking.most_cited}
              emptyMessage="Sem citações registradas."
            />

            <OverviewProductsCard
              variant="least"
              items={overview.product_ranking.least_cited}
              emptyMessage="Sem citações registradas."
            />
          </section>
        </>
      ) : isAdmin && !selectedCompanyId ? (
        <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
          Selecione uma empresa no topo para visualizar o dashboard.
        </div>
      ) : (
        <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
          Não foi possível carregar os dados do dashboard.
        </div>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="h-97.5 animate-pulse rounded-xl border bg-muted/40" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={`dashboard-skeleton-${index}`}
            className="h-62.5 animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>
    </>
  );
}

