import Link from "next/link";
import { ArrowLeft, PackageSearch } from "lucide-react";

import { ProductFormWizard } from "@/components/products/product-form-wizard";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Cadastrar Produto");

export default function DashboardProductCreatePage() {
  return (
    <div className="flex w-full max-w-full flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-2 font-medium text-foreground hover:text-foreground/80"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <span className="text-muted-foreground">
          Cadastro de Produtos / Adicionar produto
        </span>
      </div>

      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <PackageSearch className="size-6" />
        Cadastro de Produtos
      </h2>

      <ProductFormWizard mode="create" />
    </div>
  );
}

