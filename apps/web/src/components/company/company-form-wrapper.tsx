"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuthUser } from "@/hooks/use-auth-user";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import {
  createEmptyPaginationMeta,
  DEFAULT_PAGE_SIZE,
} from "@/lib/pagination";
import { tryApiDelete } from "@/lib/try-api";
import {
  companiesApiResponseSchema,
  type CompanyListItem,
  type CompanyListMeta,
} from "@/schemas/company";

import { CompanyFilterForm } from "./company-filter-form";
import { CompanyTable } from "./company-table";

export function CompanyFormWrapper() {
  const router = useRouter();
  const authUser = useAuthUser();
  const canDeleteCompanies = authUser?.role === "ADMIN";
  const [searchDraft, setSearchDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [companies, setCompanies] = React.useState<CompanyListItem[]>([]);
  const [meta, setMeta] = React.useState<CompanyListMeta>(
    createEmptyPaginationMeta<CompanyListMeta>(),
  );
  const [actionCompanyId, setActionCompanyId] = React.useState<string | null>(null);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [page_size, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const requestIdRef = React.useRef(0);

  const loadCompanies = React.useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(pageIndex + 1));
    params.set("page_size", String(page_size));

    if (query.trim().length > 0) {
      params.set("q", query.trim());
    }

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const response = await apiFetch<unknown>(`/companies?${params.toString()}`);
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      const parsedResponse = companiesApiResponseSchema.safeParse(response);
      if (!parsedResponse.success) {
        toast.error("Resposta inesperada ao carregar empresas.");
        setCompanies([]);
        setMeta(createEmptyPaginationMeta<CompanyListMeta>(page_size));
        return;
      }

      setCompanies(parsedResponse.data.data);
      setMeta(parsedResponse.data.meta);

      const normalizedPageIndex = Math.max(0, parsedResponse.data.meta.page - 1);
      if (normalizedPageIndex !== pageIndex) {
        setPageIndex(normalizedPageIndex);
      }
    } catch (error) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      toast.error(parseApiError(error));
      setCompanies([]);
      setMeta(createEmptyPaginationMeta<CompanyListMeta>(page_size));
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [pageIndex, page_size, query]);

  React.useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const handleSearch = React.useCallback(() => {
    const nextQuery = searchDraft.trim();

    if (nextQuery === query && pageIndex === 0) {
      void loadCompanies();
      return;
    }

    setPageIndex(0);
    setQuery(nextQuery);
  }, [loadCompanies, pageIndex, query, searchDraft]);

  const handlePageSizeChange = React.useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPageIndex(0);
  }, []);

  const handleAddCompany = React.useCallback(() => {
    router.push("/dashboard/companies/new");
  }, [router]);

  const handleViewDetails = React.useCallback((company: CompanyListItem) => {
    router.push(`/dashboard/companies/${company.id}`);
  }, [router]);

  const handleDeleteCompany = React.useCallback(
    async (company: CompanyListItem) => {
      if (!canDeleteCompanies) {
        toast.error("Perfil sem permissão para excluir empresas.");
        return;
      }

      const confirmed = window.confirm(
        `Confirma a exclusão da empresa "${company.name}"?`,
      );
      if (!confirmed) {
        return;
      }

      setActionCompanyId(company.id);

      try {
        const deleted = await tryApiDelete(
          `/companies/${company.id}`,
          "Empresa excluída com sucesso.",
        );
        if (!deleted) {
          return;
        }

        if (companies.length === 1 && pageIndex > 0) {
          setPageIndex((currentPage) => Math.max(0, currentPage - 1));
          return;
        }

        void loadCompanies();
      } finally {
        setActionCompanyId((currentCompanyId) =>
          currentCompanyId === company.id ? null : currentCompanyId,
        );
      }
    },
    [canDeleteCompanies, companies.length, loadCompanies, pageIndex],
  );

  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-xl font-semibold">Empresas cadastradas</h3>

      <CompanyFilterForm
        searchValue={searchDraft}
        page_size={page_size}
        isLoading={isLoading}
        onSearchValueChange={setSearchDraft}
        onPageSizeChange={handlePageSizeChange}
        onSubmit={handleSearch}
        onAddCompany={handleAddCompany}
      />

      <CompanyTable
        data={companies}
        isLoading={isLoading}
        actionCompanyId={actionCompanyId}
        canDeleteCompanies={canDeleteCompanies}
        pageIndex={pageIndex}
        page_size={page_size}
        total_pages={meta.total_pages}
        onPageChange={setPageIndex}
        onViewDetails={handleViewDetails}
        onDeleteCompany={handleDeleteCompany}
      />
    </section>
  );
}


