"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";

export function MobileAddProductButton() {
  const router = useRouter();
  const authUser = useAuthUser();

  const canManageProducts =
    authUser?.role === "DIRETOR" ||
    authUser?.role === "GERENTE_COMERCIAL" ||
    authUser?.role === "SUPERVISOR";

  return (
    <Button
      type="button"
      className="min-w-45 lg:hidden"
      onClick={() => router.push("/dashboard/products/new")}
      disabled={!canManageProducts}
    >
      Adicionar produto
      <Plus className="size-4" />
    </Button>
  );
}

