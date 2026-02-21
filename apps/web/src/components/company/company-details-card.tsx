import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CompanyDetails } from "@/schemas/company";

type CompanyDetailsCardProps = {
  company: CompanyDetails;
  onEditCompany: () => void;
};

function getCompanyInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "?";
  }

  return trimmed.charAt(0).toUpperCase();
}

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) {
    return value;
  }

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

export function CompanyDetailsCard({ company, onEditCompany }: CompanyDetailsCardProps) {
  return (
    <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border bg-card p-5 shadow-xs">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#212a38] text-xl font-semibold text-white">
          {getCompanyInitial(company.name)}
        </div>

        <div className="flex min-w-0 flex-col">
          <p className="truncate text-2xl font-semibold">{company.name}</p>
          <p className="truncate text-sm text-muted-foreground">
            {formatCnpj(company.cnpj)}
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onEditCompany}
        className="shrink-0"
      >
        <Pencil className="size-5" />
      </Button>
    </div>
  );
}


