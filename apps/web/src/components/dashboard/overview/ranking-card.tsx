import {
  MoveDownRight,
  MoveUpRight,
} from "lucide-react";

import { OverviewCardFrame } from "./card-frame";
import type { OverviewRankingItem } from "./types";
import { OverviewUserRankingList } from "./user-ranking-list";

type SupplementalRanking = {
  title: string;
  items: OverviewRankingItem[];
  emptyMessage: string;
};

export function OverviewRankingCard({
  variant,
  items,
  emptyMessage,
  supplemental,
}: {
  variant: "highest" | "lowest";
  items: OverviewRankingItem[];
  emptyMessage: string;
  supplemental?: SupplementalRanking;
}) {
  const isHighest = variant === "highest";

  return (
    <OverviewCardFrame>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[1.05rem] font-medium leading-snug md:text-[1.1rem]">
          <span className="text-muted-foreground">Ranking </span>
          <span
            className={`font-bold ${isHighest ? "text-[#1c826e]" : "text-[#e05b62]"}`}
          >
            {isHighest ? "maior " : "menor "}
          </span>
          <span className="text-foreground font-bold">volume</span>
          <span className="text-muted-foreground"> de interações</span>
        </h4>

        {isHighest ? (
          <MoveUpRight className="size-3.5 text-[#1c826e]" />
        ) : (
          <MoveDownRight className="size-3.5 text-[#e05b62]" />
        )}
      </div>

      <div className="mt-5">
        <OverviewUserRankingList items={items} emptyMessage={emptyMessage} />
      </div>

      {supplemental ? (
        <div className="border-border mt-4 border-t pt-3">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {supplemental.title}
          </p>
          <div className="mt-2">
            <OverviewUserRankingList
              items={supplemental.items}
              emptyMessage={supplemental.emptyMessage}
              compact
            />
          </div>
        </div>
      ) : null}
    </OverviewCardFrame>
  );
}

