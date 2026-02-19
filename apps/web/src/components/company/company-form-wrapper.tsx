"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import {
  createEmptyPaginationMeta,
  DEFAULT_PAGE_SIZE,
} from "@/lib/pagination";
import {
  companiesApiResponseSchema,
  type CompanyListItem,
  type CompanyListMeta,
} from "@/schemas/company";

import { CompanyFilterForm } from "./company-filter-form";
import { CompanyTable } from "./company-table";

export function CompanyFormWrapper() {
  const router = useRouter();
  const [searchDraft, setSearchDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [companies, setCompanies] = React.useState<CompanyListItem[]>([]);
  const [meta, setMeta] = React.useState<CompanyListMeta>(
    createEmptyPaginationMeta<CompanyListMeta>(),
  );
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const requestIdRef = React.useRef(0);

  const loadCompanies = React.useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(pageIndex + 1));
    params.set("pageSize", String(pageSize));

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
        setMeta(createEmptyPaginationMeta<CompanyListMeta>(pageSize));
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
      setMeta(createEmptyPaginationMeta<CompanyListMeta>(pageSize));
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [pageIndex, pageSize, query]);

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

  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-xl font-semibold">Empresas cadastradas</h3>

      <CompanyFilterForm
        searchValue={searchDraft}
        pageSize={pageSize}
        isLoading={isLoading}
        onSearchValueChange={setSearchDraft}
        onPageSizeChange={handlePageSizeChange}
        onSubmit={handleSearch}
        onAddCompany={handleAddCompany}
      />

      <CompanyTable
        data={companies}
        isLoading={isLoading}
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalPages={meta.totalPages}
        onPageChange={setPageIndex}
        onViewDetails={handleViewDetails}
      />
    </section>
  );
}

