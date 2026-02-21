import { DashboardOverviewPanel } from "@/components/dashboard/dashboard-overview";
import { createPageMetadata } from "@/lib/metadata";
import { LayoutDashboard } from "lucide-react";

export const metadata = createPageMetadata("Dashboard");

export default function DashboardPage() {
  return (
    <div className="flex w-full max-w-full flex-col gap-5 p-5 md:p-6">
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <LayoutDashboard className="size-6" />
        Dashboard
      </h2>

      <DashboardOverviewPanel />
    </div>
  );
}

