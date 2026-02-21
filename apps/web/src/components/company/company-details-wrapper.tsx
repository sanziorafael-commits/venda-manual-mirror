"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/hooks/use-auth-user";
import { canResendActivationInvite } from "@/lib/activation-invite";
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
import { userDetailsApiResponseSchema } from "@/schemas/user";

import { CompanyDetailsCard } from "./company-details-card";
import { CompanyUsersFilterForm } from "./company-users-filter-form";
import { CompanyUsersTable } from "./company-users-table";

type CompanyDetailsWrapperProps = {
  company_id: string;
};

export function CompanyDetailsWrapper({
  company_id,
}: CompanyDetailsWrapperProps) {
  const router = useRouter();
  const authUser = useAuthUser();
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
  const [page_size, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [actionUserId, setActionUserId] = React.useState<string | null>(null);
  const usersRequestIdRef = React.useRef(0);

  const loadCompany = React.useCallback(async () => {
    setIsCompanyLoading(true);
    setCompanyLoadError(null);

    try {
      const response = await apiFetch<unknown>(`/companies/${company_id}`);
      const parsed = companyDetailsApiResponseSchema.safeParse(response);

      if (!parsed.success) {
        setCompany(null);
        setCompanyLoadError("N�o foi poss�vel carregar os dados da empresa.");
        return;
      }

      setCompany(parsed.data.data);
    } catch (error) {
      setCompany(null);
      setCompanyLoadError(parseApiError(error));
    } finally {
      setIsCompanyLoading(false);
    }
  }, [company_id]);

  const loadUsers = React.useCallback(async () => {
    const params = new URLSearchParams();
    params.set("company_id", company_id);
    params.set("page", String(pageIndex + 1));
    params.set("page_size", String(page_size));

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
        toast.error("Resposta inesperada ao carregar Usu�rios da empresa.");
        setUsers([]);
        setMeta(createEmptyPaginationMeta<CompanyListMeta>(page_size));
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
      setMeta(createEmptyPaginationMeta<CompanyListMeta>(page_size));
    } finally {
      if (currentRequestId === usersRequestIdRef.current) {
        setIsUsersLoading(false);
      }
    }
  }, [company_id, pageIndex, page_size, query]);

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
    router.push(`/dashboard/companies/${company_id}/edit`);
  }, [company_id, router]);

  const handleAddUser = React.useCallback(() => {
    router.push(`/dashboard/users/new?company_id=${company_id}`);
  }, [company_id, router]);

  const handleEditUser = React.useCallback(
    (user: CompanyUserItem) => {
      router.push(`/dashboard/users/${user.id}/edit?company_id=${company_id}`);
    },
    [company_id, router],
  );

  const canResendActivationForUser = React.useCallback(
    (user: CompanyUserItem) =>
      canResendActivationInvite(authUser, {
        role: user.role,
        company_id: user.company_id,
        manager_id: user.manager_id,
        email: user.email,
        is_active: user.is_active,
        deleted_at: user.deleted_at,
        password_status: user.password_status,
      }),
    [authUser],
  );

  const handleResendActivation = React.useCallback(
    async (user: CompanyUserItem) => {
      if (!canResendActivationForUser(user)) {
        toast.error("Usu�rio sem permiss�o ou ineleg�vel para reenvio de ativa��o.");
        return;
      }

      const confirmed = window.confirm(
        `Confirma reenviar o link de ativa��o para "${user.full_name}"?`,
      );
      if (!confirmed) {
        return;
      }

      setActionUserId(user.id);

      try {
        await apiFetch<unknown>("/auth/resend-activation", {
          method: "POST",
          body: {
            user_id: user.id,
          },
        });

        toast.success("Link de ativa��o reenviado com sucesso.");
      } catch (error) {
        toast.error(parseApiError(error));
      } finally {
        setActionUserId((currentUserId) =>
          currentUserId === user.id ? null : currentUserId,
        );
      }
    },
    [canResendActivationForUser],
  );

  const handleDeleteUser = React.useCallback(
    async (user: CompanyUserItem) => {
      if (user.deleted_at) {
        toast.error("Usu�rio j� est� exclu�do.");
        return;
      }

      const confirmed = window.confirm(
        `Confirma a exclus�o do usu�rio "${user.full_name}"? Esta a��o � irrevers�vel.`,
      );

      if (!confirmed) {
        return;
      }

      setActionUserId(user.id);

      try {
        const deleted = await tryApiDelete(
          `/users/${user.id}`,
          "Usu�rio exclu�do com sucesso.",
        );
        if (!deleted) {
          return;
        }

        if (users.length === 1 && pageIndex > 0) {
          setPageIndex((currentPage) => Math.max(0, currentPage - 1));
          return;
        }

        void loadUsers();
      } finally {
        setActionUserId((currentUserId) =>
          currentUserId === user.id ? null : currentUserId,
        );
      }
    },
    [loadUsers, pageIndex, users.length],
  );

  const handleReactivateUser = React.useCallback(
    async (user: CompanyUserItem) => {
      if (user.is_active) {
        toast.error("Usu�rio j� est� ativo.");
        return;
      }

      const confirmed = window.confirm(
        `Confirma reativar o usu�rio "${user.full_name}"?`,
      );
      if (!confirmed) {
        return;
      }

      setActionUserId(user.id);

      try {
        const response = await apiFetch<unknown>(`/users/${user.id}`, {
          method: "PATCH",
          body: {
            is_active: true,
          },
        });

        const parsed = userDetailsApiResponseSchema.safeParse(response);
        if (!parsed.success) {
          toast.error("Resposta inesperada ao reativar usu�rio.");
          return;
        }

        toast.success("Usu�rio reativado com sucesso.");
        void loadUsers();
      } catch (error) {
        toast.error(parseApiError(error));
      } finally {
        setActionUserId((currentUserId) =>
          currentUserId === user.id ? null : currentUserId,
        );
      }
    },
    [loadUsers],
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
        {companyLoadError ?? "N�o foi poss�vel carregar a empresa."}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <CompanyDetailsCard company={company} onEditCompany={handleEditCompany} />

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-2xl font-semibold">Usu�rios da empresa</h3>
          <Button
            type="button"
            className="bg-emerald-600 text-white hover:bg-emerald-700 lg:hidden"
            onClick={handleAddUser}
          >
            Adicionar usu�rio
            <Plus className="size-4" />
          </Button>
        </div>

        <CompanyUsersFilterForm
          searchValue={searchDraft}
          page_size={page_size}
          isLoading={isUsersLoading}
          onSearchValueChange={setSearchDraft}
          onPageSizeChange={handlePageSizeChange}
          onSubmit={handleSearch}
          onAddUser={handleAddUser}
        />

        <CompanyUsersTable
          data={users}
          isLoading={isUsersLoading}
          actionUserId={actionUserId}
          pageIndex={pageIndex}
          page_size={page_size}
          total_pages={meta.total_pages}
          onPageChange={setPageIndex}
          onEditUser={handleEditUser}
          canResendActivationForUser={canResendActivationForUser}
          onResendActivation={handleResendActivation}
          onReactivateUser={handleReactivateUser}
          onDeleteUser={handleDeleteUser}
        />
      </div>
    </section>
  );
}


