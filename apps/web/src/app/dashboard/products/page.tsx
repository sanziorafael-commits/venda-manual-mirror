import { PackageSearch } from "lucide-react";

import { MobileAddProductButton } from "@/components/products/mobile-add-product-button";
import { ProductListWrapper } from "@/components/products/product-list-wrapper";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Cadastro de Produtos");

export default function DashboardProductsPage() {
  return (
    <div className="flex w-full max-w-full flex-col gap-6 p-6">
      <div className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <PackageSearch className="size-6" />
          Cadastro de Produtos
        </h2>
        <MobileAddProductButton />
      </div>

      <ProductListWrapper />
    </div>
  );
}

