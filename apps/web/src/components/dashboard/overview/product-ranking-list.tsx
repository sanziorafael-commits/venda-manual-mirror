import { Package } from "lucide-react";

import type { OverviewProductItem } from "./types";

const numberFormatter = new Intl.NumberFormat("pt-BR");

export function OverviewProductRankingList({
  items,
  emptyMessage,
}: {
  items: OverviewProductItem[];
  emptyMessage: string;
}) {
  if (!items.length) {
    return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li
          key={`${item.product_id}-${index}`}
          className="flex items-center justify-between gap-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Package className="text-muted-foreground size-3.5 shrink-0" />
            <p className="text-foreground truncate text-[1.05rem] font-medium leading-tight">
              {item.product_name}
            </p>
          </div>
          <span className="text-foreground shrink-0 text-[1.05rem] font-semibold leading-none">
            {numberFormatter.format(item.citations)}
          </span>
        </li>
      ))}
    </ul>
  );
}

