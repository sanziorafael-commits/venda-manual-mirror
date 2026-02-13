import { Building2 } from "lucide-react";

import { CompanyFormWrapper } from "@/components/company/company-form-wrapper";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Empresas");

export default function DashboardCompaniesPage() {
  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 p-6">
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <Building2 className="size-6" />
        Empresas
      </h2>

      <CompanyFormWrapper />
    </div>
  );
}
