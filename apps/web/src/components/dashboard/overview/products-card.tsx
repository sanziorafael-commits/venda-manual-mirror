import {
  MoveDownRight,
  MoveUpRight,
} from "lucide-react";

import { OverviewCardFrame } from "./card-frame";
import { OverviewProductRankingList } from "./product-ranking-list";
import type { OverviewProductItem } from "./types";

export function OverviewProductsCard({
  variant,
  items,
  emptyMessage,
}: {
  variant: "most" | "least";
  items: OverviewProductItem[];
  emptyMessage: string;
}) {
  const isMost = variant === "most";

  return (
    <OverviewCardFrame>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[1.05rem] font-medium leading-snug md:text-[1.1rem]">
          <span className="text-muted-foreground">Produtos </span>
          <span
            className={`font-bold ${isMost ? "text-[#1c826e]" : "text-[#e05b62]"}`}
          >
            {isMost ? "mais " : "menos "}
          </span>
          <span className="text-foreground font-bold">citados</span>
          <span className="text-muted-foreground"> nas interacoes</span>
        </h4>

        {isMost ? (
          <MoveUpRight className="size-3.5 text-[#1c826e]" />
        ) : (
          <MoveDownRight className="size-3.5 text-[#e05b62]" />
        )}
      </div>

      <div className="mt-5">
        <OverviewProductRankingList items={items} emptyMessage={emptyMessage} />
      </div>
    </OverviewCardFrame>
  );
}
