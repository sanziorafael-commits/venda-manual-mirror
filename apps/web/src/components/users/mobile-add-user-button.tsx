"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";
import { canAccessUsersModule } from "@/lib/role-capabilities";

export function MobileAddUserButton() {
  const router = useRouter();
  const authUser = useAuthUser();
  const canManageUsers = authUser ? canAccessUsersModule(authUser.role) : false;

  return (
    <Button
      type="button"
      className="min-w-42.5 lg:hidden"
      onClick={() => router.push("/dashboard/users/new")}
      disabled={!canManageUsers}
    >
      {"Adicionar usu\u00e1rio"}
      <Plus className="size-4" />
    </Button>
  );
}

