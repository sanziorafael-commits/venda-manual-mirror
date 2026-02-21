import { MapPinned } from "lucide-react";

import { LocatedClientsWrapper } from "@/components/located-clients/located-clients-wrapper";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Clientes Localizados");

export default function DashboardLocatedClientsPage() {
  return (
    <div className="flex w-full max-w-full flex-col gap-6 p-6">
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <MapPinned className="size-6" />
        Clientes Localizados
      </h2>

      <LocatedClientsWrapper />
    </div>
  );
}

