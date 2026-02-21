import { OverviewInteractionsSeriesChart } from "./interactions-series-chart";
import type { OverviewSeriesPoint } from "./types";

const numberFormatter = new Intl.NumberFormat("pt-BR");

export function OverviewTotalInteractionsCard({
  total_interactions,
  points,
  seriesTotal,
}: {
  total_interactions: number;
  points: OverviewSeriesPoint[];
  seriesTotal: number;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-xs md:p-5">
      <p className="text-muted-foreground text-sm font-medium">Total de interações</p>
      <h3 className="text-foreground mt-1 text-4xl font-semibold md:text-5xl">
        {numberFormatter.format(total_interactions)} interações
      </h3>
      <div className="mt-4">
        <OverviewInteractionsSeriesChart points={points} total={seriesTotal} />
      </div>
    </section>
  );
}

