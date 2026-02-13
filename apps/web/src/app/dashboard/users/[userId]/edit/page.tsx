import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";

import { UserEditForm } from "@/components/users/user-edit-form";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Editar Usuário");

type DashboardUserEditPageProps = {
  params: Promise<{
    userId: string;
  }>;
  searchParams: Promise<{
    companyId?: string;
  }>;
};

export default async function DashboardUserEditPage({
  params,
  searchParams,
}: DashboardUserEditPageProps) {
  const { userId } = await params;
  const { companyId } = await searchParams;
  const backHref = companyId
    ? `/dashboard/companies/${companyId}`
    : "/dashboard/users";

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 font-medium text-foreground hover:text-foreground/80"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <span className="text-muted-foreground">Usuários / Editar usuário</span>
      </div>

      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <UserRound className="size-6" />
        Usuários
      </h2>

      <h3 className="text-2xl font-semibold">Editar usuário</h3>

      <UserEditForm userId={userId} backHref={backHref} />
    </div>
  );
}
