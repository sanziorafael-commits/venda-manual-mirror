import { DashboardOverviewPanel } from "@/components/dashboard/dashboard-overview";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Dashboard");

export default function DashboardPage() {
  return (
    <div className="flex w-full max-w-full flex-col gap-5 p-5 md:p-6">
      <h2 className="text-foreground text-[2.05rem] font-semibold leading-none">
        Dashboard
      </h2>

      <DashboardOverviewPanel />
    </div>
  );
}
