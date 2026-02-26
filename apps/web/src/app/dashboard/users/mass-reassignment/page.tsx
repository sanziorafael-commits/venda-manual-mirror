import { ArrowRightLeft } from "lucide-react";

import { UsersMassReassignmentWrapper } from "@/components/users/users-mass-reassignment-wrapper";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Alteração em Massa");

export default function DashboardUsersMassReassignmentPage() {
  return (
    <div className="flex w-full max-w-full flex-col gap-6 p-6">
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <ArrowRightLeft className="size-6" />
        Alteração em Massa
      </h2>

      <UsersMassReassignmentWrapper />
    </div>
  );
}
