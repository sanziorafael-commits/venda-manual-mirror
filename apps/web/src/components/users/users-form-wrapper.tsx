"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuthHydrated, useAuthUser } from "@/hooks/use-auth-user";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import { tryApiDelete } from "@/lib/try-api";
import {
  companiesApiResponseSchema,
  type CompanyListItem,
} from "@/schemas/company";
import {
  usersApiResponseSchema,
  type UserListItem,
  type UserListMeta,
  type UserRole,
} from "@/schemas/user";

import { UsersFilterForm } from "./users-filter-form";
import { UsersTable } from "./users-table";

const DEFAULT_PAGE_SIZE = 10;
const FILTER_ALL_COMPANIES = "__ALL__";
const FILTER_PLATFORM_ADMINS = "__PLATFORM__";

type UserStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const EMPTY_META: UserListMeta = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

async function fetchAllCompaniesForFilter(): Promise<CompanyListItem[] | null> {
  const pageSize = 100;
  let page = 1;
  let totalPages = 1;
  const allCompanies: CompanyListItem[] = [];

  while (page <= totalPages) {
    const response = await apiFetch<unknown>(
      `/companies?page=${page}&pageSize=${pageSize}`,
    );
    const parsed = companiesApiResponseSchema.safeParse(response);
    if (!parsed.success) {
      return null;
    }

    allCompanies.push(...parsed.data.data);
    totalPages = parsed.data.meta.totalPages;
    page += 1;
  }

  return allCompanies;
}

export function UsersFormWrapper() {
  const router = useRouter();
  const authUser = useAuthUser();
  const authHydrated = useAuthHydrated();
  const isAdmin = authUser?.role === "ADMIN";

  const [searchDraft, setSearchDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
  const [users, setUsers] = React.useState<UserListItem[]>([]);
  const [meta, setMeta] = React.useState<UserListMeta>(EMPTY_META);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);
  const [companyOptions, setCompanyOptions] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [companyFilterValue, setCompanyFilterValue] =
    React.useState(FILTER_ALL_COMPANIES);
  const [roleFilterValue, setRoleFilterValue] = React.useState<
    "ALL" | UserRole
  >("ALL");
  const [statusFilterValue, setStatusFilterValue] =
    React.useState<UserStatusFilter>("ALL");

  const usersRequestIdRef = React.useRef(0);
  const companyFiltersRequestIdRef = React.useRef(0);

  const loadCompanyFilters = React.useCallback(async () => {
    if (!authHydrated) {
      return;
    }

    if (!isAdmin) {
      setCompanyOptions([]);
      return;
    }

    const currentRequestId = ++companyFiltersRequestIdRef.current;

    try {
      const allCompanies = await fetchAllCompaniesForFilter();
      if (currentRequestId !== companyFiltersRequestIdRef.current) {
        return;
      }

      if (!allCompanies) {
        toast.error("Não foi possível carregar o filtro de empresas.");
        setCompanyOptions([]);
        return;
      }

      setCompanyOptions(
        allCompanies.map((company) => ({
          id: company.id,
          name: company.name,
        })),
      );
    } catch (error) {
      if (currentRequestId !== companyFiltersRequestIdRef.current) {
        return;
      }

      toast.error(parseApiError(error));
      setCompanyOptions([]);
    }
  }, [authHydrated, isAdmin]);

  const loadUsers = React.useCallback(async () => {
    if (!authHydrated) {
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
      if (companyFilterValue === FILTER_PLATFORM_ADMINS) {
        params.set("role", "ADMIN");
      } else {
        if (companyFilterValue !== FILTER_ALL_COMPANIES) {
          params.set("companyId", companyFilterValue);
        }

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
    companyFilterValue,
    isAdmin,
    pageIndex,
    pageSize,
    query,
    roleFilterValue,
    statusFilterValue,
  ]);

  React.useEffect(() => {
    void loadCompanyFilters();
  }, [loadCompanyFilters]);

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

  const handleCompanyFilterChange = React.useCallback((value: string) => {
    setCompanyFilterValue(value);
    if (value === FILTER_PLATFORM_ADMINS) {
      setRoleFilterValue("ADMIN");
    }
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
    router.push("/dashboard/users/new");
  }, [router]);

  const handleEditUser = React.useCallback(
    (user: UserListItem) => {
      router.push(`/dashboard/users/${user.id}/edit`);
    },
    [router],
  );

  const handleDeleteUser = React.useCallback(
    async (user: UserListItem) => {
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
    [loadUsers, pageIndex, statusFilterValue, users.length],
  );

  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-2xl font-semibold">Usuários cadastrados</h3>

      <UsersFilterForm
        searchValue={searchDraft}
        pageSize={pageSize}
        isLoading={isLoadingUsers}
        isAdmin={isAdmin}
        showAdminFiltersSkeleton={!authHydrated}
        companyFilterValue={companyFilterValue}
        roleFilterValue={roleFilterValue}
        statusFilterValue={statusFilterValue}
        companyOptions={companyOptions}
        onSearchValueChange={setSearchDraft}
        onPageSizeChange={handlePageSizeChange}
        onCompanyFilterChange={handleCompanyFilterChange}
        onRoleFilterChange={handleRoleFilterChange}
        onStatusFilterChange={handleStatusFilterChange}
        onSubmit={handleSearch}
        onAddUser={handleAddUser}
      />

      <UsersTable
        data={users}
        isLoading={isLoadingUsers}
        isAdmin={isAdmin}
        pageIndex={pageIndex}
        pageSize={pageSize}
        totalPages={meta.totalPages}
        onPageChange={setPageIndex}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteUser}
      />
    </section>
  );
}

