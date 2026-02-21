import { MapPin } from "lucide-react";

import { OverviewCardFrame } from "./card-frame";

export function OverviewLocatedClientsCard({ value }: { value: number }) {
  return (
    <OverviewCardFrame>
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-foreground max-w-55 text-[1.15rem] font-semibold leading-tight md:text-[1.2rem]">
          Novos clientes localizados
        </h4>
        <span className="inline-flex size-24 items-center justify-center rounded-full bg-[#dceceb] text-[2.9rem] font-semibold leading-none text-[#1f2733]">
          {value}
        </span>
      </div>
      <div className="text-muted-foreground mt-6 flex items-center gap-2 text-sm">
        <MapPin className="size-3.5" />
        Via geolocalização
      </div>
    </OverviewCardFrame>
  );
}

