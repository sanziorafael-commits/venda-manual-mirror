"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuthHydrated, useAuthUser } from "@/hooks/use-auth-user";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import {
  createEmptyPaginationMeta,
  DEFAULT_PAGE_SIZE,
} from "@/lib/pagination";
import { tryApiDelete } from "@/lib/try-api";
import {
  productsApiResponseSchema,
  type ProductListItem,
  type ProductListMeta,
} from "@/schemas/product";
import {
  isPlatformAdminContext,
  useSelectedCompanyContext,
} from "@/stores/company-context-store";

import { ProductFilterForm } from "./product-filter-form";
import { ProductTable } from "./product-table";

export function ProductListWrapper() {
  const router = useRouter();
  const authUser = useAuthUser();
  const authHydrated = useAuthHydrated();
  const selectedCompanyContext = useSelectedCompanyContext();
  const isAdmin = authUser?.role === "ADMIN";
  const canManageProducts =
    authUser?.role === "DIRETOR" ||
    authUser?.role === "GERENTE_COMERCIAL" ||
    authUser?.role === "SUPERVISOR";

  const selectedCompanyId = React.useMemo(() => {
    if (!isAdmin) {
      return authUser?.companyId ?? null;
    }

    if (
      !selectedCompanyContext ||
      isPlatformAdminContext(selectedCompanyContext)
    ) {
      return null;
    }

    return selectedCompanyContext;
  }, [authUser?.companyId, isAdmin, selectedCompanyContext]);

  const [searchDraft, setSearchDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [products, setProducts] = React.useState<ProductListItem[]>([]);
  const [meta, setMeta] = React.useState<ProductListMeta>(
    createEmptyPaginationMeta<ProductListMeta>(),
  );
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const requestIdRef = React.useRef(0);

  const loadProducts = React.useCallback(async () => {
    if (!authHydrated) {
      return;
    }

    if (isAdmin && !selectedCompanyId) {
      setProducts([]);
      setMeta(createEmptyPaginationMeta<ProductListMeta>(pageSize));
      setIsLoading(false);
      return;
    }

    const params = new URLSearchParams();
    params.set("page", String(pageIndex + 1));
    params.set("pageSize", String(pageSize));

    if (query.trim().length > 0) {
      params.set("q", query.trim());
    }

    if (isAdmin && selectedCompanyId) {
      params.set("companyId", selectedCompanyId);
    }

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const response = await apiFetch<unknown>(`/products?${params.toString()}`);
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      const parsed = productsApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        toast.error("Resposta inesperada ao carregar produtos.");
        setProducts([]);
        setMeta(createEmptyPaginationMeta<ProductListMeta>(pageSize));
        return;
      }

      setProducts(parsed.data.data);
      setMeta(parsed.data.meta);

      const normalizedPageIndex = Math.max(0, parsed.data.meta.page - 1);
      if (normalizedPageIndex !== pageIndex) {
        setPageIndex(normalizedPageIndex);
      }
    } catch (error) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      toast.error(parseApiError(error));
      setProducts([]);
      setMeta(createEmptyPaginationMeta<ProductListMeta>(pageSize));
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [authHydrated, isAdmin, pageIndex, pageSize, query, selectedCompanyId]);

  React.useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  React.useEffect(() => {
    if (!isAdmin) {
      return;
    }

    setPageIndex(0);
  }, [isAdmin, selectedCompanyContext]);

  const handleSearch = React.useCallback(() => {
    const nextQuery = searchDraft.trim();

    if (nextQuery === query && pageIndex === 0) {
      void loadProducts();
      return;
    }

    setPageIndex(0);
    setQuery(nextQuery);
  }, [loadProducts, pageIndex, query, searchDraft]);

  const handlePageSizeChange = React.useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPageIndex(0);
  }, []);

  const handleAddProduct = React.useCallback(() => {
    if (!canManageProducts) {
      toast.error("Seu perfil possui acesso somente leitura em produtos.");
      return;
    }

    router.push("/dashboard/products/new");
  }, [canManageProducts, router]);

  const handleViewDetails = React.useCallback(
    (product: ProductListItem) => {
      router.push(`/dashboard/products/${product.id}`);
    },
    [router],
  );

  const handleEditProduct = React.useCallback(
    (product: ProductListItem) => {
      if (!canManageProducts) {
        toast.error("Seu perfil possui acesso somente leitura em produtos.");
        return;
      }

      router.push(`/dashboard/products/${product.id}/edit`);
    },
    [canManageProducts, router],
  );

  const handleDeleteProduct = React.useCallback(
    async (product: ProductListItem) => {
      if (!canManageProducts) {
        toast.error("Seu perfil possui acesso somente leitura em produtos.");
        return;
      }

      const confirmed = window.confirm(
        `Confirma a exclusão do produto "${product.nome}"?`,
      );
      if (!confirmed) {
        return;
      }

      const deleted = await tryApiDelete(
        `/products/${product.id}`,
        "Produto excluído com sucesso.",
      );
      if (!deleted) {
        return;
      }

      if (products.length === 1 && pageIndex > 0) {
        setPageIndex((currentPage) => Math.max(0, currentPage - 1));
        return;
      }

      void loadProducts();
    },
    [canManageProducts, loadProducts, pageIndex, products.length],
  );

  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-2xl font-semibold">Produtos cadastrados</h3>

      <ProductFilterForm
        searchValue={searchDraft}
        pageSize={pageSize}
        isLoading={isLoading}
        canAddProduct={canManageProducts}
        onSearchValueChange={setSearchDraft}
        onPageSizeChange={handlePageSizeChange}
        onSubmit={handleSearch}
        onAddProduct={handleAddProduct}
      />

      {isAdmin && !selectedCompanyId ? (
        <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
          Selecione uma empresa no topo para visualizar os produtos.
        </div>
      ) : (
        <ProductTable
          data={products}
          isLoading={isLoading}
          canManageProducts={canManageProducts}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalPages={meta.totalPages}
          onPageChange={setPageIndex}
          onViewDetails={handleViewDetails}
          onEditProduct={handleEditProduct}
          onDeleteProduct={handleDeleteProduct}
        />
      )}
    </section>
  );
}
