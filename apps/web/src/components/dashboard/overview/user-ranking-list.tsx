import { Smartphone, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";

import type { OverviewRankingItem } from "./types";

const numberFormatter = new Intl.NumberFormat("pt-BR");

export function OverviewUserRankingList({
  items,
  emptyMessage,
  compact = false,
}: {
  items: OverviewRankingItem[];
  emptyMessage: string;
  compact?: boolean;
}) {
  if (!items.length) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  return (
    <ul className={compact ? "space-y-2" : "space-y-2.5"}>
      {items.map((item, index) => {
        const first = index === 0 && !compact;
        return (
          <li
            key={`${item.user_name}-${index}`}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              {first ? (
                <Smartphone className="text-foreground size-5 shrink-0" />
              ) : (
                <Smartphone className="text-muted-foreground size-3.5 shrink-0" />
              )}
              <p
                className={cn(
                  "text-foreground truncate",
                  compact
                    ? "text-xs font-medium"
                    : first
                      ? "text-[1.25rem] font-semibold md:text-[1.3rem]"
                      : "text-muted-foreground text-[1.05rem] font-medium",
                )}
              >
                {item.user_name}
              </p>
              {first && <Trophy className="size-4 shrink-0 text-[#1c826e]" />}
            </div>

            <span
              className={cn(
                "shrink-0 font-semibold leading-none",
                compact
                  ? "text-foreground text-xs"
                  : first
                    ? "text-foreground text-[1.25rem] md:text-[1.3rem]"
                    : "text-muted-foreground text-[1.05rem]",
              )}
            >
              {numberFormatter.format(item.interactions)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

