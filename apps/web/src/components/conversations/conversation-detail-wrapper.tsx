"use client";

import * as React from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";

import { DateRangePicker } from "@/components/conversations/date-range-picker";
import { Button } from "@/components/ui/button";
import { useAuthHydrated } from "@/hooks/use-auth-user";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import {
  conversationDetailApiResponseSchema,
  type ConversationDetail,
} from "@/schemas/conversation";

type ConversationDetailWrapperProps = {
  conversationId: string;
};

export function ConversationDetailWrapper({
  conversationId,
}: ConversationDetailWrapperProps) {
  const authHydrated = useAuthHydrated();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    undefined,
  );
  const [isLoadingConversationDetail, setIsLoadingConversationDetail] =
    React.useState(true);
  const [conversationDetail, setConversationDetail] =
    React.useState<ConversationDetail | null>(null);

  const detailRequestRef = React.useRef(0);

  const loadConversationDetail = React.useCallback(
    async (selectedRange: DateRange | undefined) => {
      if (!authHydrated) {
        return;
      }

      const currentRequestId = ++detailRequestRef.current;
      setIsLoadingConversationDetail(true);

      try {
        const params = new URLSearchParams();
        const startDate = selectedRange?.from
          ? format(selectedRange.from, "yyyy-MM-dd")
          : null;
        const endSource = selectedRange?.to ?? selectedRange?.from;
        const endDate = endSource ? format(endSource, "yyyy-MM-dd") : null;

        if (startDate) {
          params.set("startDate", startDate);
        }

        if (endDate) {
          params.set("endDate", endDate);
        }

        const queryString = params.toString();
        const response = await apiFetch<unknown>(
          `/conversations/${conversationId}${
            queryString.length > 0 ? `?${queryString}` : ""
          }`,
        );

        if (currentRequestId !== detailRequestRef.current) {
          return;
        }

        const parsed = conversationDetailApiResponseSchema.safeParse(response);
        if (!parsed.success) {
          toast.error("Resposta inesperada ao carregar detalhes da conversa.");
          setConversationDetail(null);
          return;
        }

        setConversationDetail(parsed.data.data);
      } catch (error) {
        if (currentRequestId !== detailRequestRef.current) {
          return;
        }

        toast.error(parseApiError(error));
        setConversationDetail(null);
      } finally {
        if (currentRequestId === detailRequestRef.current) {
          setIsLoadingConversationDetail(false);
        }
      }
    },
    [authHydrated, conversationId],
  );

  React.useEffect(() => {
    void loadConversationDetail(dateRange);
  }, [dateRange, loadConversationDetail]);

  const hasDateFilter = Boolean(dateRange?.from);

  return (
    <section className="rounded-xl border bg-card p-6 shadow-xs">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-xl font-semibold">
            {conversationDetail
              ? `Histórico de ${conversationDetail.vendedorNome}`
              : "Histórico da conversa"}
          </h3>
          {conversationDetail ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {conversationDetail.companyName
                ? `${conversationDetail.companyName} `
                : ""}
              {/* {conversationDetail.clienteNome
                ? `Cliente: ${conversationDetail.clienteNome}`
                : "Cliente não identificado"} */}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            disabled={isLoadingConversationDetail}
          />
          {hasDateFilter ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDateRange(undefined)}
            >
              Limpar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="max-h-[620px] space-y-3 overflow-y-auto rounded-xl border bg-muted/20 p-5">
        {isLoadingConversationDetail ? (
          Array.from({ length: 6 }, (_, index) => (
            <div
              key={`message-skeleton-${index}`}
              className={index % 2 ? "flex justify-end" : "flex justify-start"}
            >
              <div className="h-20 w-3/4 animate-pulse rounded-xl bg-muted" />
            </div>
          ))
        ) : conversationDetail?.mensagens.length ? (
          conversationDetail.mensagens.map((message, index, messages) => {
            const messageDateKey = getDateGroupKey(message.timestamp);
            const previousDateKey =
              index > 0 ? getDateGroupKey(messages[index - 1].timestamp) : null;
            const shouldRenderDateSeparator =
              messageDateKey !== previousDateKey;

            return (
              <React.Fragment key={message.id}>
                {shouldRenderDateSeparator ? (
                  <div className="sticky top-2 z-10 flex justify-center py-2">
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                      {formatDatePillLabel(message.timestamp)}
                    </span>
                  </div>
                ) : null}

                <div
                  className={
                    message.sender === "vendedor"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <article
                    className={
                      message.sender === "vendedor"
                        ? "relative max-w-[80%] rounded-xl bg-[#BCF9DA] px-4 py-3 text-[#515151] shadow-xs"
                        : "relative max-w-[80%] rounded-xl bg-[#f6f6f6] px-4 py-3 text-[#515151] shadow-xs"
                    }
                  >
                    <span
                      className={
                        message.sender === "vendedor"
                          ? "absolute h-4 w-4 -right-2 top-4 bg-[#BCF9DA] rotate-45"
                          : "absolute h-4 w-4 -left-2 top-4 bg-[#f6f6f6] rotate-45"
                      }
                    ></span>
                    <p className="mb-1 text-sm font-bold text-[#212A38]">
                      {message.sender === "vendedor"
                        ? conversationDetail.vendedorNome
                        : "HandSell"}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">
                      {message.text}
                    </p>
                    <p className="mt-2 text-right text-[11px] text-muted-foreground">
                      {formatTime(message.timestamp)}
                    </p>
                  </article>
                </div>
              </React.Fragment>
            );
          })
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Sem mensagens para os filtros selecionados.
          </div>
        )}
      </div>
    </section>
  );
}

function formatTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "--:--";
  }

  return parsed.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDateGroupKey(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return `invalid-${value}`;
  }

  return parsed.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDatePillLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Data indisponível";
  }

  return parsed.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
