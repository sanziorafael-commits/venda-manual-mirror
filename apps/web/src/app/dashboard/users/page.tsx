import { UserRound } from "lucide-react";

import { UsersFormWrapper } from "@/components/users/users-form-wrapper";

export default function DashboardUsersPage() {
  return (
    <div className="flex w-full max-w-full flex-col gap-6 p-6">
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <UserRound className="size-6" />
        Usuários
      </h2>

      <UsersFormWrapper />
    </div>
  );
}
