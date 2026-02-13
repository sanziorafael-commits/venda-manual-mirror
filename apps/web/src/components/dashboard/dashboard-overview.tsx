"use client";

import * as React from "react";
import { toast } from "sonner";

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

import { OverviewAdoptionCard } from "./overview/adoption-card";
import { OverviewLocatedClientsCard } from "./overview/located-clients-card";
import { OverviewProductsCard } from "./overview/products-card";
import { OverviewRankingCard } from "./overview/ranking-card";
import { OverviewTotalInteractionsCard } from "./overview/total-interactions-card";

const PERIOD_ORDER: DashboardPeriod[] = ["365d", "30d", "7d", "today"];

type RankingItem = DashboardOverview["userRanking"]["highestVolume"][number];

export function DashboardOverviewPanel() {
  const authUser = useAuthUser();
  const authHydrated = useAuthHydrated();
  const isAdmin = authUser?.role === "ADMIN";
  const isManager = authUser?.role === "GERENTE_COMERCIAL";

  const [isLoadingOptions, setIsLoadingOptions] = React.useState(true);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [filterOptions, setFilterOptions] =
    React.useState<DashboardFilterOptions | null>(null);
  const [period, setPeriod] = React.useState<DashboardPeriod>("365d");
  const [scope, setScope] = React.useState<DashboardScope>("all");
  const [companyId, setCompanyId] = React.useState("");
  const [overview, setOverview] = React.useState<DashboardOverview | null>(
    null,
  );
  const [series, setSeries] = React.useState<DashboardSeries | null>(null);

  const optionsRequestRef = React.useRef(0);
  const dashboardRequestRef = React.useRef(0);

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
      setCompanyId(
        options.defaults.companyId ?? options.companyOptions[0]?.value ?? "",
      );
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

    if (isAdmin && !companyId) {
      setOverview(null);
      setSeries(null);
      setIsLoadingData(false);
      return;
    }

    const params = new URLSearchParams();
    params.set("period", period);
    params.set("scope", scope);

    if (isAdmin && companyId) {
      params.set("companyId", companyId);
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
  }, [authHydrated, companyId, filterOptions, isAdmin, period, scope]);

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
    return [...filterOptions.periodOptions].sort((left, right) => {
      const leftIndex = orderIndex.get(left.value as DashboardPeriod) ?? 100;
      const rightIndex = orderIndex.get(right.value as DashboardPeriod) ?? 100;
      return leftIndex - rightIndex;
    });
  }, [filterOptions]);

  const selectedCompanyName = React.useMemo(() => {
    if (overview?.company?.name) {
      return overview.company.name;
    }

    const bySelectedId = filterOptions?.companyOptions.find(
      (option) => option.value === companyId,
    );
    if (bySelectedId?.label) {
      return bySelectedId.label;
    }

    return null;
  }, [companyId, filterOptions?.companyOptions, overview?.company?.name]);

  const selectedHighestRanking = React.useMemo(() => {
    if (!overview) {
      return [] as RankingItem[];
    }

    return overview.userRanking.highestVolume;
  }, [overview]);

  const selectedLowestRanking = React.useMemo(() => {
    if (!overview) {
      return [] as RankingItem[];
    }

    return overview.userRanking.lowestVolume;
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

  const showSupervisorSupplementalRanking =
    overview?.scope === "all" &&
    isManager &&
    Boolean(overview.rankingsByScope.supervisors);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          {isAdmin ? (
            <label className="text-muted-foreground flex min-w-[280px] flex-col gap-1.5 text-xs font-medium">
              Empresa
              <select
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
                disabled={isLoadingOptions || isLoadingData}
              >
                {filterOptions?.companyOptions.length ? (
                  filterOptions.companyOptions.map((companyOption) => (
                    <option
                      key={companyOption.value}
                      value={companyOption.value}
                    >
                      {companyOption.label}
                    </option>
                  ))
                ) : (
                  <option value="">Nenhuma empresa disponivel</option>
                )}
              </select>
            </label>
          ) : null}

          {isManager ? (
            <label className="text-muted-foreground flex min-w-[240px] flex-col gap-1.5 text-xs font-medium">
              Escopo
              <select
                value={scope}
                onChange={(event) =>
                  setScope(event.target.value as DashboardScope)
                }
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
                disabled={isLoadingOptions || isLoadingData}
              >
                {filterOptions?.scopeOptions.map((scopeOption) => (
                  <option key={scopeOption.value} value={scopeOption.value}>
                    {scopeOption.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {!isAdmin && selectedCompanyName ? (
            <div className="bg-muted/40 border-border flex items-center gap-2 rounded-full border px-3 py-1.5">
              <span className="bg-sidebar-primary text-sidebar-primary-foreground inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold">
                {initialFromName(selectedCompanyName)}
              </span>
              <span className="text-foreground text-sm font-medium">
                {selectedCompanyName}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {orderedPeriodOptions.map((periodOption) => (
            <button
              key={periodOption.value}
              type="button"
              onClick={() => setPeriod(periodOption.value as DashboardPeriod)}
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
        </div>
      </div>

      {isLoadingData && !overview ? (
        <DashboardSkeleton />
      ) : overview && series ? (
        <>
          <OverviewTotalInteractionsCard
            totalInteractions={overview.totalInteractions}
            points={series.points}
            seriesTotal={series.totalInteractions}
          />

          <section className="grid gap-4 xl:grid-cols-3">
            <OverviewAdoptionCard
              entityLabel={rankingScopeLabel}
              activeWithInteractions={
                overview.adoptionRate.activeWithInteractions
              }
              activeEntities={overview.adoptionRate.activeEntities}
              ratePercent={overview.adoptionRate.ratePercent}
            />

            <OverviewRankingCard
              variant="highest"
              items={selectedHighestRanking}
              emptyMessage="Sem dados para o periodo."
              supplemental={
                showSupervisorSupplementalRanking &&
                overview.rankingsByScope.supervisors
                  ? {
                      title: "Supervisores no escopo total",
                      items: overview.rankingsByScope.supervisors.highestVolume,
                      emptyMessage: "Sem dados de supervisores.",
                    }
                  : undefined
              }
            />

            <OverviewRankingCard
              variant="lowest"
              items={selectedLowestRanking}
              emptyMessage="Sem dados para o periodo."
              supplemental={
                showSupervisorSupplementalRanking &&
                overview.rankingsByScope.supervisors
                  ? {
                      title: "Supervisores no escopo total",
                      items: overview.rankingsByScope.supervisors.lowestVolume,
                      emptyMessage: "Sem dados de supervisores.",
                    }
                  : undefined
              }
            />

            <OverviewLocatedClientsCard value={overview.newLocatedClients} />

            <OverviewProductsCard
              variant="most"
              items={overview.productRanking.mostCited}
              emptyMessage="Sem citacoes registradas."
            />

            <OverviewProductsCard
              variant="least"
              items={overview.productRanking.leastCited}
              emptyMessage="Sem citacoes registradas."
            />
          </section>
        </>
      ) : (
        <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
          Nao foi possivel carregar os dados do dashboard.
        </div>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="h-[390px] animate-pulse rounded-xl border bg-muted/40" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={`dashboard-skeleton-${index}`}
            className="h-[250px] animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>
    </>
  );
}

function initialFromName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "H";
  }

  return trimmed[0]!.toUpperCase();
}
