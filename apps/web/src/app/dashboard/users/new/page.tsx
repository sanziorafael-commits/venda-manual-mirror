import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";

import { UserCreateForm } from "@/components/users/user-create-form";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Adicionar Usuário");

type DashboardUserCreatePageProps = {
  searchParams: Promise<{
    companyId?: string;
  }>;
};

export default async function DashboardUserCreatePage({
  searchParams,
}: DashboardUserCreatePageProps) {
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

        <span className="text-muted-foreground">Usuários / Adicionar usuário</span>
      </div>

      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <UserRound className="size-6" />
        Usuários
      </h2>

      <h3 className="text-2xl font-semibold">Adicionar usuário</h3>

      <UserCreateForm prefilledCompanyId={companyId ?? null} />
    </div>
  );
}
