"use client";

import * as React from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { DateRangePicker } from "@/components/conversations/date-range-picker";
import { Button } from "@/components/ui/button";
import { useAuthHydrated, useAuthUser } from "@/hooks/use-auth-user";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import {
  conversationsApiResponseSchema,
  type ConversationListItem,
  type ConversationListMeta,
} from "@/schemas/conversation";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50];
const DEFAULT_PAGE_SIZE = 10;

const EMPTY_META: ConversationListMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

export function ConversationsHistoryWrapper() {
  const router = useRouter();
  const authUser = useAuthUser();
  const authHydrated = useAuthHydrated();
  const isAdmin = authUser?.role === "ADMIN";

  const [searchDraft, setSearchDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    undefined,
  );
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [isLoadingConversations, setIsLoadingConversations] =
    React.useState(true);
  const [conversations, setConversations] = React.useState<ConversationListItem[]>(
    [],
  );
  const [meta, setMeta] = React.useState<ConversationListMeta>(EMPTY_META);

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

    const currentRequestId = ++conversationsRequestRef.current;
    setIsLoadingConversations(true);

    try {
      const response = await apiFetch<unknown>(`/conversations?${params.toString()}`);
      if (currentRequestId !== conversationsRequestRef.current) {
        return;
      }

      const parsed = conversationsApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        toast.error("Resposta inesperada ao carregar histórico.");
        setConversations([]);
        setMeta({
          ...EMPTY_META,
          pageSize,
        });
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
      setMeta({
        ...EMPTY_META,
        pageSize,
      });
    } finally {
      if (currentRequestId === conversationsRequestRef.current) {
        setIsLoadingConversations(false);
      }
    }
  }, [authHydrated, endDate, pageIndex, pageSize, query, startDate]);

  React.useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const handleSearch = React.useCallback(() => {
    const nextQuery = searchDraft.trim();

    if (nextQuery === query && pageIndex === 0) {
      void loadConversations();
      return;
    }

    setPageIndex(0);
    setQuery(nextQuery);
  }, [loadConversations, pageIndex, query, searchDraft]);

  const handleClearFilters = React.useCallback(() => {
    setSearchDraft("");
    setQuery("");
    setDateRange(undefined);
    setPageIndex(0);
  }, []);

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

  const canGoBack = pageIndex > 0;
  const canGoForward = pageIndex + 1 < meta.totalPages;
  const pages = buildPageList(pageIndex, meta.totalPages);

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <form
            className="flex w-full max-w-2xl flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch();
            }}
          >
            <label htmlFor="conversations-search" className="text-sm font-medium">
              Buscar por vendedor ou cliente
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
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFilters}
                disabled={isLoadingConversations}
              >
                Limpar
              </Button>
            </div>
          </form>

          <div className="flex items-center gap-2">
            <div className="flex flex-col gap-1 text-sm">
              <span>Data</span>
              <DateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                disabled={isLoadingConversations}
                className="min-w-[230px]"
              />
            </div>

            <label className="flex flex-col gap-1 text-sm">
              Itens
              <select
                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={String(pageSize)}
                onChange={(event) => handlePageSizeChange(Number(event.target.value))}
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
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Nome do vendedor</th>
                <th className="px-4 py-3 font-semibold">Último cliente</th>
                {isAdmin ? (
                  <th className="px-4 py-3 font-semibold">Distribuidor</th>
                ) : null}
                <th className="px-4 py-3 font-semibold">Interações</th>
                <th className="px-4 py-3 font-semibold">Última interação</th>
                <th className="px-4 py-3 text-right font-semibold">Conversa</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingConversations
                ? Array.from(
                    { length: Math.max(4, Math.min(pageSize, 8)) },
                    (_, rowIndex) => (
                      <tr key={`loading-${rowIndex}`} className="border-t">
                        {Array.from(
                          { length: isAdmin ? 6 : 5 },
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
                        <p className="font-medium">{conversation.vendedorNome}</p>
                        {conversation.vendedorTelefone ? (
                          <p className="text-xs text-muted-foreground">
                            {formatPhone(conversation.vendedorTelefone)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        {conversation.ultimoClienteNome ?? "-"}
                      </td>
                      {isAdmin ? (
                        <td className="px-4 py-4">
                          {conversation.companyName ?? "Sem empresa"}
                        </td>
                      ) : null}
                      <td className="px-4 py-4">{conversation.totalInteracoes}</td>
                      <td className="px-4 py-4">
                        {formatDateTime(conversation.ultimaInteracaoEm)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                          onClick={() =>
                            router.push(`/dashboard/conversations/${conversation.id}`)
                          }
                        >
                          Ver conversa
                        </Button>
                      </td>
                    </tr>
                  ))}

              {!isLoadingConversations && conversations.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
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

      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canGoBack || isLoadingConversations}
            onClick={() => setPageIndex(pageIndex - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {pages.map((page) => (
            <Button
              key={page}
              type="button"
              variant={page === pageIndex ? "default" : "ghost"}
              size="icon-sm"
              disabled={isLoadingConversations}
              onClick={() => setPageIndex(page)}
            >
              {page + 1}
            </Button>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canGoForward || isLoadingConversations}
            onClick={() => setPageIndex(pageIndex + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
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

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 13) {
    return digits.replace(/^(\d{2})(\d{2})(\d{5})(\d{4})$/, "+$1 ($2) $3-$4");
  }

  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }

  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }

  return phone;
}

function buildPageList(currentPage: number, totalPages: number, maxPages = 7) {
  if (totalPages <= maxPages) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const sideSlots = Math.floor((maxPages - 1) / 2);
  const start = Math.max(
    0,
    Math.min(currentPage - sideSlots, totalPages - maxPages),
  );

  return Array.from({ length: maxPages }, (_, index) => start + index);
}
