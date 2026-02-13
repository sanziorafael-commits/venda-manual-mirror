import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

import { CompanyCreateForm } from "@/components/company/company-create-form";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Adicionar Empresa");

export default function DashboardCompanyCreatePage() {
  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/dashboard/companies"
          className="inline-flex items-center gap-2 font-medium text-foreground hover:text-foreground/80"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <span className="text-muted-foreground">Empresas / Adicionar empresa</span>
      </div>

      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <Building2 className="size-6" />
        Empresas
      </h2>

      <h3 className="text-2xl font-semibold">Adicionar empresa</h3>

      <CompanyCreateForm />
    </div>
  );
}
