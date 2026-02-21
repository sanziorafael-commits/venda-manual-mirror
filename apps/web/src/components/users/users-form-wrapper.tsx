"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuthHydrated, useAuthUser } from "@/hooks/use-auth-user";
import { canResendActivationInvite } from "@/lib/activation-invite";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import {
  createEmptyPaginationMeta,
  DEFAULT_PAGE_SIZE,
} from "@/lib/pagination";
import { tryApiDelete } from "@/lib/try-api";
import {
  userDetailsApiResponseSchema,
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

type UserStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

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
  const [meta, setMeta] = React.useState<UserListMeta>(
    createEmptyPaginationMeta<UserListMeta>(),
  );
  const [pageIndex, setPageIndex] = React.useState(0);
  const [page_size, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [roleFilterValue, setRoleFilterValue] = React.useState<
    "ALL" | UserRole
  >("ALL");
  const [statusFilterValue, setStatusFilterValue] =
    React.useState<UserStatusFilter>("ALL");
  const [actionUserId, setActionUserId] = React.useState<string | null>(null);

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
      setMeta(createEmptyPaginationMeta<UserListMeta>(page_size));
      setIsLoadingUsers(false);
      return;
    }

    const params = new URLSearchParams();
    params.set("page", String(pageIndex + 1));
    params.set("page_size", String(page_size));

    if (query.trim().length > 0) {
      params.set("q", query.trim());
    }

    if (statusFilterValue === "ACTIVE") {
      params.set("is_active", "true");
    }

    if (statusFilterValue === "INACTIVE") {
      params.set("is_active", "false");
    }

    if (isAdmin) {
      if (isPlatformAdminSelected) {
        params.set("role", "ADMIN");
      } else if (selectedCompanyContext) {
        params.set("company_id", selectedCompanyContext);

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
        setMeta(createEmptyPaginationMeta<UserListMeta>(page_size));
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
      setMeta(createEmptyPaginationMeta<UserListMeta>(page_size));
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
    page_size,
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

  const canResendActivationForUser = React.useCallback(
    (user: UserListItem) =>
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
    async (user: UserListItem) => {
      if (!canResendActivationForUser(user)) {
        toast.error("Usuario sem permissao ou inelegivel para reenvio de ativacao.");
        return;
      }

      const confirmed = window.confirm(
        `Confirma reenviar o link de ativacao para "${user.full_name}"?`,
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

        toast.success("Link de ativacao reenviado com sucesso.");
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
    async (user: UserListItem) => {
      if (!canManageUsers) {
        toast.error("Perfil sem permissao para excluir usuarios.");
        return;
      }

      if (user.deleted_at) {
        toast.error("Usuario ja esta excluido.");
        return;
      }

      const confirmed = window.confirm(
        `Confirma a exclusao do usuario "${user.full_name}"? Esta acao e irreversivel.`,
      );

      if (!confirmed) {
        return;
      }

      setActionUserId(user.id);

      try {
        const deleted = await tryApiDelete(
          `/users/${user.id}`,
          "Usuario excluido com sucesso.",
        );
        if (!deleted) {
          return;
        }

        if (
          users.length === 1 &&
          pageIndex > 0 &&
          statusFilterValue !== "ALL"
        ) {
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
    [canManageUsers, loadUsers, pageIndex, statusFilterValue, users.length],
  );

  const handleReactivateUser = React.useCallback(
    async (user: UserListItem) => {
      if (!canManageUsers) {
        toast.error("Perfil sem permissao para reativar usuarios.");
        return;
      }

      if (user.is_active) {
        toast.error("Usuario ja esta ativo.");
        return;
      }

      const confirmed = window.confirm(
        `Confirma reativar o usuario "${user.full_name}"?`,
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
          toast.error("Resposta inesperada ao reativar usuario.");
          return;
        }

        toast.success("Usuario reativado com sucesso.");

        if (
          users.length === 1 &&
          pageIndex > 0 &&
          statusFilterValue === "INACTIVE"
        ) {
          setPageIndex((currentPage) => Math.max(0, currentPage - 1));
          return;
        }

        void loadUsers();
      } catch (error) {
        toast.error(parseApiError(error));
      } finally {
        setActionUserId((currentUserId) =>
          currentUserId === user.id ? null : currentUserId,
        );
      }
    },
    [canManageUsers, loadUsers, pageIndex, statusFilterValue, users.length],
  );

  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-2xl font-semibold">Usuários cadastrados</h3>

      <UsersFilterForm
        searchValue={searchDraft}
        page_size={page_size}
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
          actionUserId={actionUserId}
          isAdmin={isAdmin}
          canManageUsers={canManageUsers}
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
      )}
    </section>
  );
}

