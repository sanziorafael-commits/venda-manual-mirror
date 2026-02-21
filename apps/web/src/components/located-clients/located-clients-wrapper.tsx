"use client";

import * as React from "react";
import { format } from "date-fns";
import { MapPin, Search, Trash2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { DateRangePicker } from "@/components/conversations/date-range-picker";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useAuthHydrated, useAuthUser } from "@/hooks/use-auth-user";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import { formatPhoneDisplay } from "@/lib/phone";
import {
  createEmptyPaginationMeta,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from "@/lib/pagination";
import { tryApiDelete } from "@/lib/try-api";
import {
  locatedClientsApiResponseSchema,
  type LocatedClientListItem,
  type LocatedClientListMeta,
} from "@/schemas/located-client";
import {
  isPlatformAdminContext,
  useSelectedCompanyContext,
} from "@/stores/company-context-store";

export function LocatedClientsWrapper() {
  const authUser = useAuthUser();
  const authHydrated = useAuthHydrated();
  const selectedCompanyContext = useSelectedCompanyContext();
  const isAdmin = authUser?.role === "ADMIN";
  const canMutateLocatedClients =
    authUser?.role === "DIRETOR" ||
    authUser?.role === "GERENTE_COMERCIAL" ||
    authUser?.role === "SUPERVISOR";

  const selectedCompanyId = React.useMemo(() => {
    if (!isAdmin) {
      return authUser?.company_id ?? null;
    }

    if (
      !selectedCompanyContext ||
      isPlatformAdminContext(selectedCompanyContext)
    ) {
      return null;
    }

    return selectedCompanyContext;
  }, [authUser?.company_id, isAdmin, selectedCompanyContext]);

  const [searchDraft, setSearchDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    undefined,
  );
  const [pageIndex, setPageIndex] = React.useState(0);
  const [page_size, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [isLoadingLocatedClients, setIsLoadingLocatedClients] =
    React.useState(true);
  const [locatedClients, setLocatedClients] = React.useState<
    LocatedClientListItem[]
  >([]);
  const [meta, setMeta] = React.useState<LocatedClientListMeta>(
    createEmptyPaginationMeta<LocatedClientListMeta>(),
  );

  const requestRef = React.useRef(0);

  const start_date = React.useMemo(() => {
    if (!dateRange?.from) {
      return null;
    }

    return format(dateRange.from, "yyyy-MM-dd");
  }, [dateRange?.from]);

  const end_date = React.useMemo(() => {
    const endSource = dateRange?.to ?? dateRange?.from;
    if (!endSource) {
      return null;
    }

    return format(endSource, "yyyy-MM-dd");
  }, [dateRange?.from, dateRange?.to]);

  const loadLocatedClients = React.useCallback(async () => {
    if (!authHydrated) {
      return;
    }

    if (isAdmin && !selectedCompanyId) {
      setLocatedClients([]);
      setMeta(createEmptyPaginationMeta<LocatedClientListMeta>(page_size));
      setIsLoadingLocatedClients(false);
      return;
    }

    const params = new URLSearchParams();
    params.set("page", String(pageIndex + 1));
    params.set("page_size", String(page_size));

    if (query.trim().length > 0) {
      params.set("seller", query.trim());
    }

    if (start_date) {
      params.set("start_date", start_date);
    }

    if (end_date) {
      params.set("end_date", end_date);
    }

    if (isAdmin && selectedCompanyId) {
      params.set("company_id", selectedCompanyId);
    }

    const currentRequestId = ++requestRef.current;
    setIsLoadingLocatedClients(true);

    try {
      const response = await apiFetch<unknown>(
        `/located-clients?${params.toString()}`,
      );
      if (currentRequestId !== requestRef.current) {
        return;
      }

      const parsed = locatedClientsApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        toast.error("Resposta inesperada ao carregar clientes localizados.");
        setLocatedClients([]);
        setMeta(createEmptyPaginationMeta<LocatedClientListMeta>(page_size));
        return;
      }

      setLocatedClients(parsed.data.data);
      setMeta(parsed.data.meta);

      const normalizedPageIndex = Math.max(0, parsed.data.meta.page - 1);
      if (normalizedPageIndex !== pageIndex) {
        setPageIndex(normalizedPageIndex);
      }
    } catch (error) {
      if (currentRequestId !== requestRef.current) {
        return;
      }

      toast.error(parseApiError(error));
      setLocatedClients([]);
      setMeta(createEmptyPaginationMeta<LocatedClientListMeta>(page_size));
    } finally {
      if (currentRequestId === requestRef.current) {
        setIsLoadingLocatedClients(false);
      }
    }
  }, [
    authHydrated,
    end_date,
    isAdmin,
    pageIndex,
    page_size,
    query,
    selectedCompanyId,
    start_date,
  ]);

  React.useEffect(() => {
    void loadLocatedClients();
  }, [loadLocatedClients]);

  React.useEffect(() => {
    if (!isAdmin) {
      return;
    }

    setPageIndex(0);
  }, [isAdmin, selectedCompanyContext]);

  const handleSearch = React.useCallback(() => {
    const nextQuery = searchDraft.trim();

    if (nextQuery === query && pageIndex === 0) {
      void loadLocatedClients();
      return;
    }

    setPageIndex(0);
    setQuery(nextQuery);
  }, [loadLocatedClients, pageIndex, query, searchDraft]);

  const handlePageSizeChange = React.useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPageIndex(0);
  }, []);

  const handleDateRangeChange = React.useCallback(
    (nextDateRange: DateRange | undefined) => {
      setDateRange(nextDateRange);
      setPageIndex(0);
    },
    [],
  );

  const handleDelete = React.useCallback(
    async (item: LocatedClientListItem) => {
      if (!canMutateLocatedClients) {
        toast.error(
          "Seu perfil possui acesso somente leitura em clientes localizados.",
        );
        return;
      }

      const confirmed = window.confirm(
        `Confirma a exclusao do cliente "${item.customer_name}"?`,
      );
      if (!confirmed) {
        return;
      }

      const deleted = await tryApiDelete(
        `/located-clients/${item.id}`,
        "Cliente localizado excluido com sucesso.",
      );
      if (!deleted) {
        return;
      }

      if (locatedClients.length === 1 && pageIndex > 0) {
        setPageIndex((currentPage) => Math.max(0, currentPage - 1));
        return;
      }

      void loadLocatedClients();
    },
    [
      canMutateLocatedClients,
      loadLocatedClients,
      locatedClients.length,
      pageIndex,
    ],
  );

  return (
    <section className="flex max-w-full flex-col gap-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <form
          className="flex w-full max-w-2xl flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch();
          }}
        >
          <label
            htmlFor="located-clients-search"
            className="text-sm font-medium"
          >
            Buscar por vendedor
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="located-clients-search"
              value={searchDraft}
              placeholder="Digite aqui sua busca"
              onChange={(event) => setSearchDraft(event.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
            <Button
              type="submit"
              className="bg-[#212a38] text-white hover:bg-[#182130]"
              disabled={isLoadingLocatedClients}
            >
              <Search className="size-4" />
              Buscar
            </Button>
          </div>
        </form>

        <div className="flex w-full items-end gap-2 xl:w-auto xl:justify-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm xl:flex-none">
            Data
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              disabled={isLoadingLocatedClients}
              className="w-full xl:min-w-52.5"
            />
          </label>

          <label className="flex w-24 shrink-0 flex-col gap-1 text-sm xl:w-auto">
            Itens
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] xl:w-auto"
              value={String(page_size)}
              onChange={(event) =>
                handlePageSizeChange(Number(event.target.value))
              }
              disabled={isLoadingLocatedClients}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isAdmin && !selectedCompanyId ? (
        <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
          Selecione uma empresa no topo para visualizar os clientes localizados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-295 border-collapse text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Vendedor que identificou
                  </th>
                  <th className="px-4 py-3 font-semibold">Nome do cliente</th>
                  <th className="px-4 py-3 font-semibold">Cidade</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                  <th className="px-4 py-3 font-semibold">Endereço</th>
                  <th className="px-4 py-3 font-semibold">Identificado em</th>
                  <th className="px-4 py-3 font-semibold">Mapa</th>
                  {canMutateLocatedClients ? (
                    <th className="px-4 py-3 font-semibold">Ações</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {isLoadingLocatedClients
                  ? Array.from(
                      { length: Math.max(4, Math.min(page_size, 8)) },
                      (_, rowIndex) => (
                        <tr key={`loading-${rowIndex}`} className="border-t">
                          {Array.from(
                            { length: canMutateLocatedClients ? 8 : 7 },
                            (_, columnIndex) => (
                              <td
                                key={`loading-${rowIndex}-${columnIndex}`}
                                className="px-4 py-4"
                              >
                                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                              </td>
                            ),
                          )}
                        </tr>
                      ),
                    )
                  : locatedClients.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-4 py-4">
                            <p className="font-medium">
                            {item.identified_by_user_name ??
                              "Vendedor nao identificado"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatPhoneDisplay(item.source_seller_phone)}
                          </p>
                        </td>
                        <td className="px-4 py-4">{item.customer_name}</td>
                        <td className="px-4 py-4">{item.city}</td>
                        <td className="px-4 py-4">{item.state}</td>
                        <td className="px-4 py-4">{item.address}</td>
                        <td className="px-4 py-4">
                          {formatDate(item.identified_at)}
                        </td>
                        <td className="px-4 py-4">
                          {item.map_url ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                              onClick={() =>
                                window.open(
                                  item.map_url ?? "",
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                            >
                              <MapPin className="size-3.5" />
                              Ver no mapa
                            </Button>
                          ) : (
                            "-"
                          )}
                        </td>
                        {canMutateLocatedClients ? (
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => void handleDelete(item)}
                                disabled={isLoadingLocatedClients}
                                title={`Excluir cliente ${item.customer_name}`}
                                aria-label={`Excluir cliente ${item.customer_name}`}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}

                {!isLoadingLocatedClients && locatedClients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canMutateLocatedClients ? 8 : 7}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhum cliente localizado encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PaginationControls
        pageIndex={pageIndex}
        total_pages={meta.total_pages}
        isLoading={isLoadingLocatedClients}
        onPageChange={setPageIndex}
      />
    </section>
  );
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}


