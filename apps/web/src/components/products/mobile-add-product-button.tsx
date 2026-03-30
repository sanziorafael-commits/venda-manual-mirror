"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";
import { canManageProducts } from "@/lib/role-capabilities";

export function MobileAddProductButton() {
  const router = useRouter();
  const authUser = useAuthUser();
  const canManageProductsForRole = authUser
    ? canManageProducts(authUser.role)
    : false;

  return (
    <Button
      type="button"
      className="min-w-45 lg:hidden"
      onClick={() => router.push("/dashboard/products/new")}
      disabled={!canManageProductsForRole}
    >
      Adicionar produto
      <Plus className="size-4" />
    </Button>
  );
}

