import Link from "next/link";
import { ArrowLeft, PackageSearch } from "lucide-react";

import { ProductDetailsWrapper } from "@/components/products/product-details-wrapper";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Detalhes do Produto");

type DashboardProductDetailsPageProps = {
  params: Promise<{
    productId: string;
  }>;
};

export default async function DashboardProductDetailsPage({
  params,
}: DashboardProductDetailsPageProps) {
  const { productId } = await params;

  return (
    <div className="flex w-full max-w-7xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-2 font-medium text-foreground hover:text-foreground/80"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <span className="text-muted-foreground">
          Cadastro de Produtos / Ver detalhes
        </span>
      </div>

      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <PackageSearch className="size-6" />
        Cadastro de Produtos
      </h2>

      <ProductDetailsWrapper productId={productId} />
    </div>
  );
}
