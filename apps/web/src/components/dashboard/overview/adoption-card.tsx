import { OverviewCardFrame } from "./card-frame";

const CHART_COLOR = "#1c826e";
const numberFormatter = new Intl.NumberFormat("pt-BR");

export function OverviewAdoptionCard({
  entityLabel,
  active_with_interactions,
  active_entities,
  rate_percent,
}: {
  entityLabel: string;
  active_with_interactions: number;
  active_entities: number;
  rate_percent: number;
}) {
  return (
    <OverviewCardFrame>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-foreground text-[1.15rem] font-semibold leading-none md:text-[1.2rem]">
            Taxa de adoção
          </h4>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {capitalize(entityLabel)} ativos
          </p>
        </div>
        <AdoptionRing percent={rate_percent} />
      </div>

      <div className="text-muted-foreground mt-5 text-sm">
        <p className="text-foreground font-semibold">
          {numberFormatter.format(active_with_interactions)} de{" "}
          {numberFormatter.format(active_entities)}
        </p>
        <p>{entityLabel} ativos</p>
      </div>
    </OverviewCardFrame>
  );
}

function AdoptionRing({ percent }: { percent: number }) {
  const safePercent = Math.min(100, Math.max(0, percent));
  const radius = 48;
  const stroke = 12;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const offset = circumference - (safePercent / 100) * circumference;
  const valueFontSize = safePercent >= 100 ? 24 : 28;

  return (
    <div className="inline-flex size-24 items-center justify-center">
      <svg width={radius * 2} height={radius * 2}>
        <circle
          stroke="var(--muted)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={CHART_COLOR}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: offset }}
          transform={`rotate(-90 ${radius} ${radius})`}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <text
          x={radius}
          y={radius + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--foreground)"
          fontSize={valueFontSize}
          fontWeight={700}
        >
          {safePercent}%
        </text>
      </svg>
    </div>
  );
}

function capitalize(value: string) {
  if (!value.length) {
    return value;
  }

  return `${value[0]?.toUpperCase()}${value.slice(1)}`;
}

