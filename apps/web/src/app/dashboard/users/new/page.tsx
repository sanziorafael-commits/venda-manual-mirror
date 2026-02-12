import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";

import { UserCreateForm } from "@/components/users/user-create-form";

export default function DashboardUserCreatePage() {
  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/dashboard/users"
          className="inline-flex items-center gap-2 font-medium text-foreground hover:text-foreground/80"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <span className="text-muted-foreground">Usuarios / Adicionar usuario</span>
      </div>

      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <UserRound className="size-6" />
        Usuarios
      </h2>

      <h3 className="text-2xl font-semibold">Adicionar usuario</h3>

      <UserCreateForm />
    </div>
  );
}
