import { UserRound } from "lucide-react";

import { MobileAddUserButton } from "@/components/users/mobile-add-user-button";
import { UsersFormWrapper } from "@/components/users/users-form-wrapper";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Usu\u00e1rios");

export default function DashboardUsersPage() {
  return (
    <div className="flex w-full max-w-full flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-2xl font-semibold">
          <UserRound className="size-6 shrink-0" />
          <span className="truncate">{"Usu\u00e1rios"}</span>
        </h2>
        <MobileAddUserButton />
      </div>

      <UsersFormWrapper />
    </div>
  );
}

