"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuthHydrated, useAuthUser } from "@/hooks/use-auth-user";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import { tryApiDelete } from "@/lib/try-api";
import {
  usersApiResponseSchema,
  type UserListItem,
  type UserListMeta,
  type UserRole,
} from "@/schemas/user";
import {
  isPlatformAdminContext,
  useSelectedCompanyContext,
} from "@/stores/company-context-store";

import { UsersFilterForm } from "./users-filter-form";
import { UsersTable } from "./users-table";

const DEFAULT_PAGE_SIZE = 10;

type UserStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const EMPTY_META: UserListMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

export function UsersFormWrapper() {
  const router = useRouter();
  const authUser = useAuthUser();
  const authHydrated = useAuthHydrated();
  const selectedCompanyContext = useSelectedCompanyContext();
  const isAdmin = authUser?.role === "ADMIN";
  const canManageUsers =
    authUser?.role === "ADMIN" ||
    authUser?.role === "DIRETOR" ||
    authUser?.role === "GERENTE_COMERCIAL" ||
    authUser?.role === "SUPERVISOR";
  const isPlatformAdminSelected =
    isAdmin && isPlatformAdminContext(selectedCompanyContext);

  const [searchDraft, setSearchDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [users, setUsers] = React.useState<UserListItem[]>([]);
  const [meta, setMeta] = React.useState<UserListMeta>(EMPTY_META);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [roleFilterValue, setRoleFilterValue] = React.useState<
    "ALL" | UserRole
  >("ALL");
  const [statusFilterValue, setStatusFilterValue] =
    React.useState<UserStatusFilter>("ALL");

  const usersRequestIdRef = React.useRef(0);

  React.useEffect(() => {
    if (!isPlatformAdminSelected) {
      if (isAdmin && roleFilterValue === "ADMIN") {
        setRoleFilterValue("ALL");
      }
      return;
    }

    if (roleFilterValue !== "ADMIN") {
      setRoleFilterValue("ADMIN");
    }
  }, [isAdmin, isPlatformAdminSelected, roleFilterValue]);

  React.useEffect(() => {
    if (!isAdmin) {
      return;
    }

    setPageIndex(0);
  }, [isAdmin, selectedCompanyContext]);

  const loadUsers = React.useCallback(async () => {
    if (!authHydrated) {
      return;
    }

    if (isAdmin && !selectedCompanyContext) {
      setUsers([]);
      setMeta({
        ...EMPTY_META,
        pageSize,
      });
      setIsLoadingUsers(false);
      return;
    }

    const params = new URLSearchParams();
    params.set("page", String(pageIndex + 1));
    params.set("pageSize", String(pageSize));

    if (query.trim().length > 0) {
      params.set("q", query.trim());
    }

    if (statusFilterValue === "ACTIVE") {
      params.set("isActive", "true");
    }

    if (statusFilterValue === "INACTIVE") {
      params.set("isActive", "false");
    }

    if (isAdmin) {
      if (isPlatformAdminSelected) {
        params.set("role", "ADMIN");
      } else if (selectedCompanyContext) {
        params.set("companyId", selectedCompanyContext);

        if (roleFilterValue !== "ALL") {
          params.set("role", roleFilterValue);
        }
      }
    }

    const currentRequestId = ++usersRequestIdRef.current;
    setIsLoadingUsers(true);

    try {
      const response = await apiFetch<unknown>(`/users?${params.toString()}`);
      if (currentRequestId !== usersRequestIdRef.current) {
        return;
      }

      const parsed = usersApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        toast.error("Resposta inesperada ao carregar usuários.");
        setUsers([]);
        setMeta({
          ...EMPTY_META,
          pageSize,
        });
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
      setMeta({
        ...EMPTY_META,
        pageSize,
      });
    } finally {
      if (currentRequestId === usersRequestIdRef.current) {
        setIsLoadingUsers(false);
      }
    }
  }, [
    authHydrated,
    isAdmin,
    isPlatformAdminSelected,
    pageIndex,
    pageSize,
    query,
    roleFilterValue,
    selectedCompanyContext,
    statusFilterValue,
  ]);

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

  const handleRoleFilterChange = React.useCallback(
    (value: "ALL" | UserRole) => {
      setRoleFilterValue(value);
      setPageIndex(0);
    },
    [],
  );

  const handleStatusFilterChange = React.useCallback(
    (value: UserStatusFilter) => {
      setStatusFilterValue(value);
      setPageIndex(0);
    },
    [],
  );

  const handleAddUser = React.useCallback(() => {
    if (!canManageUsers) {
      toast.error("Perfil sem permissão para cadastrar usuários.");
      return;
    }

    router.push("/dashboard/users/new");
  }, [canManageUsers, router]);

  const handleEditUser = React.useCallback(
    (user: UserListItem) => {
      if (!canManageUsers) {
        toast.error("Perfil sem permissão para editar usuários.");
        return;
      }

      router.push(`/dashboard/users/${user.id}/edit`);
    },
    [canManageUsers, router],
  );

  const handleDeleteUser = React.useCallback(
    async (user: UserListItem) => {
      if (!canManageUsers) {
        toast.error("Perfil sem permissão para excluir usuários.");
        return;
      }

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

      const deleted = await tryApiDelete(
        `/users/${user.id}`,
        "Usuário excluído com sucesso.",
      );
      if (!deleted) {
        return;
      }

      if (users.length === 1 && pageIndex > 0 && statusFilterValue !== "ALL") {
        setPageIndex((currentPage) => Math.max(0, currentPage - 1));
        return;
      }

      void loadUsers();
    },
    [canManageUsers, loadUsers, pageIndex, statusFilterValue, users.length],
  );

  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-2xl font-semibold">Usuários cadastrados</h3>

      <UsersFilterForm
        searchValue={searchDraft}
        pageSize={pageSize}
        isLoading={isLoadingUsers}
        isAdmin={isAdmin}
        roleFilterValue={roleFilterValue}
        statusFilterValue={statusFilterValue}
        forceAdminRole={isPlatformAdminSelected}
        canAddUser={canManageUsers}
        onSearchValueChange={setSearchDraft}
        onPageSizeChange={handlePageSizeChange}
        onRoleFilterChange={handleRoleFilterChange}
        onStatusFilterChange={handleStatusFilterChange}
        onSubmit={handleSearch}
        onAddUser={handleAddUser}
      />

      {isAdmin && !selectedCompanyContext ? (
        <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
          Selecione uma empresa no topo para visualizar os usuários.
        </div>
      ) : (
        <UsersTable
          data={users}
          isLoading={isLoadingUsers}
          isAdmin={isAdmin}
          canManageUsers={canManageUsers}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalPages={meta.totalPages}
          onPageChange={setPageIndex}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
        />
      )}
    </section>
  );
}
