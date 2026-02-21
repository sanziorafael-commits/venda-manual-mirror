import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

import { CompanyEditForm } from "@/components/company/company-edit-form";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Editar Empresa");

type DashboardCompanyEditPageProps = {
  params: Promise<{
    company_id: string;
  }>;
};

export default async function DashboardCompanyEditPage({
  params,
}: DashboardCompanyEditPageProps) {
  const { company_id } = await params;

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/dashboard/companies/${company_id}`}
          className="inline-flex items-center gap-2 font-medium text-foreground hover:text-foreground/80"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <span className="text-muted-foreground">Empresas / Editar empresa</span>
      </div>

      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <Building2 className="size-6" />
        Empresas
      </h2>

      <h3 className="text-2xl font-semibold">Editar empresa</h3>

      <CompanyEditForm company_id={company_id} />
    </div>
  );
}
