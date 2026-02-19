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
import { tryApiDelete } from "@/lib/try-api";
import {
  companyDetailsApiResponseSchema,
  companyUsersApiResponseSchema,
  type CompanyDetails,
  type CompanyListMeta,
  type CompanyUserItem,
} from "@/schemas/company";

import { CompanyDetailsCard } from "./company-details-card";
import { CompanyUsersFilterForm } from "./company-users-filter-form";
import { CompanyUsersTable } from "./company-users-table";

type CompanyDetailsWrapperProps = {
  companyId: string;
};

export function CompanyDetailsWrapper({
  companyId,
}: CompanyDetailsWrapperProps) {
  const router = useRouter();
  const [company, setCompany] = React.useState<CompanyDetails | null>(null);
  const [companyLoadError, setCompanyLoadError] = React.useState<string | null>(
    null,
  );
  const [isCompanyLoading, setIsCompanyLoading] = React.useState(true);

  const [searchDraft, setSearchDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [isUsersLoading, setIsUsersLoading] = React.useState(true);
  const [users, setUsers] = React.useState<CompanyUserItem[]>([]);
  const [meta, setMeta] = React.useState<CompanyListMeta>(
    createEmptyPaginationMeta<CompanyListMeta>(),
  );
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const usersRequestIdRef = React.useRef(0);

  const loadCompany = React.useCallback(async () => {
    setIsCompanyLoading(true);
    setCompanyLoadError(null);

    try {
      const response = await apiFetch<unknown>(`/companies/${companyId}`);
      const parsed = companyDetailsApiResponseSchema.safeParse(response);

      if (!parsed.success) {
        setCompany(null);
        setCompanyLoadError("Não foi possível carregar os dados da empresa.");
        return;
      }

      setCompany(parsed.data.data);
    } catch (error) {
      setCompany(null);
      setCompanyLoadError(parseApiError(error));
    } finally {
      setIsCompanyLoading(false);
    }
  }, [companyId]);

  const loadUsers = React.useCallback(async () => {
    const params = new URLSearchParams();
    params.set("companyId", companyId);
    params.set("page", String(pageIndex + 1));
    params.set("pageSize", String(pageSize));

    if (query.trim().length > 0) {
      params.set("q", query.trim());
    }

    const currentRequestId = ++usersRequestIdRef.current;
    setIsUsersLoading(true);

    try {
      const response = await apiFetch<unknown>(`/users?${params.toString()}`);
      if (currentRequestId !== usersRequestIdRef.current) {
        return;
      }

      const parsed = companyUsersApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        toast.error("Resposta inesperada ao carregar Usuários da empresa.");
        setUsers([]);
        setMeta(createEmptyPaginationMeta<CompanyListMeta>(pageSize));
        return;
      }

      setUsers(parsed.data.data);
      setMeta(parsed.data.meta);

      const normalizedPageIndex = Math.max(0, parsed.data.meta.page - 1);
      if (normalizedPageIndex !== pageIndex) {
        setPageIndex(normalizedPageIndex);
      }
    } catch (error) {
      if (currentRequestId !== usersRequestIdRef.current) {
        return;
      }

      toast.error(parseApiError(error));
      setUsers([]);
      setMeta(createEmptyPaginationMeta<CompanyListMeta>(pageSize));
    } finally {
      if (currentRequestId === usersRequestIdRef.current) {
        setIsUsersLoading(false);
      }
    }
  }, [companyId, pageIndex, pageSize, query]);

  React.useEffect(() => {
    void loadCompany();
  }, [loadCompany]);

  React.useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleSearch = React.useCallback(() => {
    const nextQuery = searchDraft.trim();

    if (nextQuery === query && pageIndex === 0) {
      void loadUsers();
      return;
    }

    setPageIndex(0);
    setQuery(nextQuery);
  }, [loadUsers, pageIndex, query, searchDraft]);

  const handlePageSizeChange = React.useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPageIndex(0);
  }, []);

  const handleEditCompany = React.useCallback(() => {
    router.push(`/dashboard/companies/${companyId}/edit`);
  }, [companyId, router]);

  const handleEditUser = React.useCallback(
    (user: CompanyUserItem) => {
      router.push(`/dashboard/users/${user.id}/edit?companyId=${companyId}`);
    },
    [companyId, router],
  );

  const handleDeleteUser = React.useCallback(
    async (user: CompanyUserItem) => {
      if (user.deletedAt) {
        toast.error("Usuário já está excluído.");
        return;
      }

      const confirmed = window.confirm(
        `Confirma a exclusão do usuário "${user.fullName}"? Esta ação é irreversível.`,
      );

      if (!confirmed) {
        return;
      }

      const deleted = await tryApiDelete(`/users/${user.id}`, "Usuário excluído com sucesso.");
      if (!deleted) {
        return;
      }

      if (users.length === 1 && pageIndex > 0) {
        setPageIndex((currentPage) => Math.max(0, currentPage - 1));
        return;
      }

      void loadUsers();
    },
    [loadUsers, pageIndex, users.length],
  );

  if (isCompanyLoading) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        Carregando dados da empresa...
      </div>
    );
  }

  if (!company) {
    return (
      <div className="rounded-xl border p-6 text-sm text-destructive">
        {companyLoadError ?? "Não foi possível carregar a empresa."}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <CompanyDetailsCard company={company} onEditCompany={handleEditCompany} />

      <div className="flex flex-col gap-5">
        <h3 className="text-2xl font-semibold">Usuários da empresa</h3>

        <CompanyUsersFilterForm
          searchValue={searchDraft}
          pageSize={pageSize}
          isLoading={isUsersLoading}
          onSearchValueChange={setSearchDraft}
          onPageSizeChange={handlePageSizeChange}
          onSubmit={handleSearch}
        />

        <CompanyUsersTable
          data={users}
          isLoading={isUsersLoading}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalPages={meta.totalPages}
          onPageChange={setPageIndex}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
        />
      </div>
    </section>
  );
}

