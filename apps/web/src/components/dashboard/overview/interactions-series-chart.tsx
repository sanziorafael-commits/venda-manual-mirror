import {
  Area,
  AreaChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { OverviewSeriesPoint } from "./types";

const numberFormatter = new Intl.NumberFormat("pt-BR");
const CHART_COLOR = "#1c826e";
const CHART_AXIS_COLOR = "var(--border)";
const CHART_TICK_COLOR = "var(--muted-foreground)";
const CHART_SURFACE_COLOR = "#ffffff";
const CHART_SURFACE_BORDER = "var(--border)";
const CHART_TOOLTIP_BG = "var(--card)";
const CHART_TOOLTIP_TEXT = "var(--foreground)";
const CHART_DOT_FILL = "var(--card)";
const CHART_LABEL_COLOR = "var(--foreground)";

export function OverviewInteractionsSeriesChart({
  points,
  total,
}: {
  points: OverviewSeriesPoint[];
  total: number;
}) {
  if (!points.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Sem dados de série temporal para este período.
      </div>
    );
  }

  const valueLabelIndexes = buildVisibleIndexes(points.length, 12);
  const axisLabelIndexes = buildVisibleIndexes(points.length, 12);
  const chartData = points.map((point, index) => ({
    index,
    label: normalizeLabel(point.label),
    interactions: point.interactions,
  }));

  return (
    <div
      className="rounded-xl p-3 md:p-4"
      style={{
        border: `1px solid ${CHART_SURFACE_BORDER}`,
        backgroundColor: CHART_SURFACE_COLOR,
      }}
    >
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 30, right: 8, left: 4, bottom: 10 }}
          >
            <defs>
              <linearGradient
                id="dashboard-series-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={0.28} />
                <stop
                  offset="100%"
                  stopColor={CHART_COLOR}
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="label"
              interval={0}
              tickLine={false}
              axisLine={{ stroke: CHART_AXIS_COLOR }}
              tick={{ fill: CHART_TICK_COLOR, fontSize: 12, fontWeight: 500 }}
              tickFormatter={(value, index) =>
                axisLabelIndexes.has(index) ? String(value) : ""
              }
            />
            <YAxis hide domain={[0, (max: number) => Math.max(max, 1)]} />
            <Tooltip
              cursor={{ stroke: CHART_AXIS_COLOR, strokeDasharray: "3 3" }}
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) {
                  return null;
                }

                const value = Number(payload[0]?.value ?? 0);
                return (
                  <div
                    className="rounded-md px-3 py-2 shadow-sm"
                    style={{
                      border: `1px solid ${CHART_AXIS_COLOR}`,
                      backgroundColor: CHART_TOOLTIP_BG,
                    }}
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {label}
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: CHART_TOOLTIP_TEXT }}
                    >
                      {numberFormatter.format(value)} interações
                    </p>
                  </div>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="interactions"
              stroke={CHART_COLOR}
              fill="url(#dashboard-series-fill)"
              strokeWidth={2.5}
              dot={{
                r: 2.8,
                fill: CHART_DOT_FILL,
                stroke: CHART_COLOR,
                strokeWidth: 1.8,
              }}
              activeDot={{
                r: 4,
                fill: CHART_DOT_FILL,
                stroke: CHART_COLOR,
                strokeWidth: 2,
              }}
            >
              <LabelList
                dataKey="interactions"
                content={(props) => {
                  const index = Number(props?.index ?? -1);
                  if (!valueLabelIndexes.has(index)) {
                    return null;
                  }

                  const value = Number(props?.value ?? 0);
                  const x = Number(props?.x ?? 0);
                  const y = Number(props?.y ?? 0);
                  const width = Number(props?.width ?? 0);
                  const labelY = Math.max(y - 10, 16);

                  return (
                    <text
                      x={x + width / 2}
                      y={labelY}
                      textAnchor="middle"
                      fill={CHART_LABEL_COLOR}
                      fontSize={13}
                      fontWeight={600}
                    >
                      {numberFormatter.format(value)}
                    </text>
                  );
                }}
              />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-muted-foreground mt-3 text-xs">
        {numberFormatter.format(total)} interações no período selecionado.
      </p>
    </div>
  );
}

function buildVisibleIndexes(total: number, maxVisible: number) {
  const indexes = new Set<number>();
  if (total <= 0) {
    return indexes;
  }

  if (total <= maxVisible) {
    for (let index = 0; index < total; index += 1) {
      indexes.add(index);
    }
    return indexes;
  }

  const step = Math.ceil(total / maxVisible);
  for (let index = 0; index < total; index += step) {
    indexes.add(index);
  }

  indexes.add(total - 1);
  return indexes;
}

function normalizeLabel(label: string) {
  const trimmed = label.trim();
  if (!trimmed) {
    return "--";
  }

  return trimmed;
}
