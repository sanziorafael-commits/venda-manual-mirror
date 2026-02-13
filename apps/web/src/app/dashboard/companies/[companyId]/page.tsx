import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

import { CompanyDetailsWrapper } from "@/components/company/company-details-wrapper";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Detalhes da Empresa");

type DashboardCompanyDetailsPageProps = {
  params: Promise<{
    companyId: string;
  }>;
};

export default async function DashboardCompanyDetailsPage({
  params,
}: DashboardCompanyDetailsPageProps) {
  const { companyId } = await params;

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

        <span className="text-muted-foreground">Empresas / Detalhes da empresa</span>
      </div>

      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <Building2 className="size-6" />
        Empresas
      </h2>

      <CompanyDetailsWrapper companyId={companyId} />
    </div>
  );
}
