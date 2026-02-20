"use client";

import * as React from "react";
import { format } from "date-fns";
import { Eye, Search } from "lucide-react";
import { useRouter } from "next/navigation";
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
import {
  conversationsApiResponseSchema,
  type ConversationListItem,
  type ConversationListMeta,
} from "@/schemas/conversation";
import {
  isPlatformAdminContext,
  useSelectedCompanyContext,
} from "@/stores/company-context-store";

export function ConversationsHistoryWrapper() {
  const router = useRouter();
  const authUser = useAuthUser();
  const authHydrated = useAuthHydrated();
  const selectedCompanyContext = useSelectedCompanyContext();
  const isAdmin = authUser?.role === "ADMIN";

  const selectedCompanyId = React.useMemo(() => {
    if (!isAdmin) {
      return authUser?.companyId ?? null;
    }

    if (
      !selectedCompanyContext ||
      isPlatformAdminContext(selectedCompanyContext)
    ) {
      return null;
    }

    return selectedCompanyContext;
  }, [authUser?.companyId, isAdmin, selectedCompanyContext]);

  const [searchDraft, setSearchDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    undefined,
  );
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [isLoadingConversations, setIsLoadingConversations] =
    React.useState(true);
  const [conversations, setConversations] = React.useState<
    ConversationListItem[]
  >([]);
  const [meta, setMeta] = React.useState<ConversationListMeta>(
    createEmptyPaginationMeta<ConversationListMeta>(),
  );

  const conversationsRequestRef = React.useRef(0);

  const startDate = React.useMemo(() => {
    if (!dateRange?.from) {
      return null;
    }

    return format(dateRange.from, "yyyy-MM-dd");
  }, [dateRange?.from]);

  const endDate = React.useMemo(() => {
    const endSource = dateRange?.to ?? dateRange?.from;
    if (!endSource) {
      return null;
    }

    return format(endSource, "yyyy-MM-dd");
  }, [dateRange?.from, dateRange?.to]);

  const loadConversations = React.useCallback(async () => {
    if (!authHydrated) {
      return;
    }

    if (isAdmin && !selectedCompanyId) {
      setConversations([]);
      setMeta(createEmptyPaginationMeta<ConversationListMeta>(pageSize));
      setIsLoadingConversations(false);
      return;
    }

    const params = new URLSearchParams();
    params.set("page", String(pageIndex + 1));
    params.set("pageSize", String(pageSize));

    if (query.trim().length > 0) {
      params.set("q", query.trim());
    }

    if (startDate) {
      params.set("startDate", startDate);
    }

    if (endDate) {
      params.set("endDate", endDate);
    }

    if (isAdmin && selectedCompanyId) {
      params.set("companyId", selectedCompanyId);
    }

    const currentRequestId = ++conversationsRequestRef.current;
    setIsLoadingConversations(true);

    try {
      const response = await apiFetch<unknown>(
        `/conversations?${params.toString()}`,
      );
      if (currentRequestId !== conversationsRequestRef.current) {
        return;
      }

      const parsed = conversationsApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        toast.error("Resposta inesperada ao carregar histórico.");
        setConversations([]);
        setMeta(createEmptyPaginationMeta<ConversationListMeta>(pageSize));
        return;
      }

      setConversations(parsed.data.data);
      setMeta(parsed.data.meta);

      const normalizedPageIndex = Math.max(0, parsed.data.meta.page - 1);
      if (normalizedPageIndex !== pageIndex) {
        setPageIndex(normalizedPageIndex);
      }
    } catch (error) {
      if (currentRequestId !== conversationsRequestRef.current) {
        return;
      }

      toast.error(parseApiError(error));
      setConversations([]);
      setMeta(createEmptyPaginationMeta<ConversationListMeta>(pageSize));
    } finally {
      if (currentRequestId === conversationsRequestRef.current) {
        setIsLoadingConversations(false);
      }
    }
  }, [
    authHydrated,
    endDate,
    isAdmin,
    pageIndex,
    pageSize,
    query,
    selectedCompanyId,
    startDate,
  ]);

  React.useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  React.useEffect(() => {
    if (!isAdmin) {
      return;
    }

    setPageIndex(0);
  }, [isAdmin, selectedCompanyContext]);

  const handleSearch = React.useCallback(() => {
    const nextQuery = searchDraft.trim();

    if (nextQuery === query && pageIndex === 0) {
      void loadConversations();
      return;
    }

    setPageIndex(0);
    setQuery(nextQuery);
  }, [loadConversations, pageIndex, query, searchDraft]);

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

  return (
    <section className="flex max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <form
          className="flex w-full max-w-2xl flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleSearch();
          }}
        >
          <label htmlFor="conversations-search" className="text-sm font-medium">
            Buscar por vendedor
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="conversations-search"
              value={searchDraft}
              placeholder="Digite aqui sua busca"
              onChange={(event) => setSearchDraft(event.target.value)}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
            <Button
              type="submit"
              className="bg-[#212a38] text-white hover:bg-[#182130]"
              disabled={isLoadingConversations}
            >
              <Search className="size-4" />
              Buscar
            </Button>
          </div>
        </form>

        <div className="flex w-full items-end gap-2 xl:w-auto xl:justify-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm xl:flex-none">
            <span>Data</span>
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              disabled={isLoadingConversations}
              className="w-full xl:min-w-57.5"
            />
          </div>

          <label className="flex w-24 shrink-0 flex-col gap-1 text-sm xl:w-auto">
            Itens
            <select
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] xl:w-auto"
              value={String(pageSize)}
              onChange={(event) =>
                handlePageSizeChange(Number(event.target.value))
              }
              disabled={isLoadingConversations}
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
          Selecione uma empresa no topo para visualizar o histórico.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-230 border-collapse text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nome do vendedor</th>
                  {isAdmin ? (
                    <th className="px-4 py-3 font-semibold">Distribuidor</th>
                  ) : null}
                  <th className="px-4 py-3 font-semibold">Interações</th>
                  <th className="px-4 py-3 font-semibold">Última interação</th>
                  <th className="px-4 py-3 font-semibold">Conversa</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingConversations
                  ? Array.from(
                      { length: Math.max(4, Math.min(pageSize, 8)) },
                      (_, rowIndex) => (
                        <tr key={`loading-${rowIndex}`} className="border-t">
                          {Array.from(
                            { length: isAdmin ? 5 : 4 },
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
                  : conversations.map((conversation) => (
                      <tr key={conversation.id} className="border-t">
                        <td className="px-4 py-4">
                          <p className="font-medium">
                            {conversation.vendedorNome}
                          </p>
                          {conversation.vendedorTelefone ? (
                            <p className="text-xs text-muted-foreground">
                              {formatPhoneDisplay(conversation.vendedorTelefone)}
                            </p>
                          ) : null}
                        </td>
                        {isAdmin ? (
                          <td className="px-4 py-4">
                            {conversation.companyName ?? "Sem empresa"}
                          </td>
                        ) : null}
                        <td className="px-4 py-4">
                          {conversation.totalInteracoes}
                        </td>
                        <td className="px-4 py-4">
                          {formatDateTime(conversation.ultimaInteracaoEm)}
                        </td>
                        <td className="px-4 py-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                            onClick={() =>
                              router.push(
                                `/dashboard/conversations/${conversation.id}`,
                              )
                            }
                          >
                            <Eye className="size-3.5" />
                            Ver conversa
                          </Button>
                        </td>
                      </tr>
                    ))}

                {!isLoadingConversations && conversations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 5 : 4}
                      className="px-4 py-8 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma conversa encontrada.
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
        totalPages={meta.totalPages}
        isLoading={isLoadingConversations}
        onPageChange={setPageIndex}
      />
    </section>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

