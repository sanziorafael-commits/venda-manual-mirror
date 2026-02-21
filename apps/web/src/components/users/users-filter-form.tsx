import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";
import type { UserRole } from "@/schemas/user";

type UserStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

type UsersFilterFormProps = {
  searchValue: string;
  page_size: number;
  isLoading: boolean;
  isAdmin: boolean;
  roleFilterValue: "ALL" | UserRole;
  statusFilterValue: UserStatusFilter;
  forceAdminRole: boolean;
  canAddUser: boolean;
  onSearchValueChange: (value: string) => void;
  onPageSizeChange: (page_size: number) => void;
  onRoleFilterChange: (value: "ALL" | UserRole) => void;
  onStatusFilterChange: (value: UserStatusFilter) => void;
  onSubmit: () => void;
  onAddUser: () => void;
};

const ROLE_OPTIONS: Array<{ value: "ALL" | UserRole; label: string }> = [
  { value: "ALL", label: "Todos os cargos" },
  { value: "ADMIN", label: "Admin" },
  { value: "DIRETOR", label: "Diretor" },
  { value: "GERENTE_COMERCIAL", label: "Gerente Comercial" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "VENDEDOR", label: "Vendedor" },
];
const STATUS_OPTIONS: Array<{ value: UserStatusFilter; label: string }> = [
  { value: "ACTIVE", label: "Ativos" },
  { value: "INACTIVE", label: "Inativos" },
  { value: "ALL", label: "Todos" },
];

export function UsersFilterForm({
  searchValue,
  page_size,
  isLoading,
  isAdmin,
  roleFilterValue,
  statusFilterValue,
  forceAdminRole,
  canAddUser,
  onSearchValueChange,
  onPageSizeChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onSubmit,
  onAddUser,
}: UsersFilterFormProps) {
  return (
    <div className="flex flex-col gap-4">
      {isAdmin ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="users-role-filter" className="text-sm font-medium">
              Cargo
            </label>
            <select
              id="users-role-filter"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={roleFilterValue}
              onChange={(event) =>
                onRoleFilterChange(event.target.value as "ALL" | UserRole)
              }
              disabled={isLoading || forceAdminRole}
            >
              {ROLE_OPTIONS.map((roleOption) => (
                <option key={roleOption.value} value={roleOption.value}>
                  {roleOption.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex w-full max-w-4xl flex-col gap-3 lg:flex-row lg:items-end">
          <form
            className="flex w-full flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            <label htmlFor="users-search" className="text-sm font-medium">
              Buscar por usuário
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="users-search"
                value={searchValue}
                placeholder="Digite aqui sua busca"
                onChange={(event) => onSearchValueChange(event.target.value)}
              />
              <Button
                type="submit"
                className="bg-[#212a38] text-white hover:bg-[#182130]"
                disabled={isLoading}
              >
                <Search className="size-4" />
                Buscar
              </Button>
            </div>
          </form>

          <div className="flex w-full items-end gap-2 lg:w-55 lg:shrink-0 lg:flex-col lg:gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-2 lg:w-full">
              <label
                htmlFor="users-status-filter"
                className="text-sm font-medium"
              >
                Status
              </label>
              <select
                id="users-status-filter"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={statusFilterValue}
                onChange={(event) =>
                  onStatusFilterChange(event.target.value as UserStatusFilter)
                }
                disabled={isLoading}
              >
                {STATUS_OPTIONS.map((statusOption) => (
                  <option key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex w-24 shrink-0 flex-col gap-2 lg:hidden">
              <label
                htmlFor="users-page-size-mobile"
                className="text-sm font-medium"
              >
                Itens
              </label>
              <select
                id="users-page-size-mobile"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={String(page_size)}
                onChange={(event) =>
                  onPageSizeChange(Number(event.target.value))
                }
                disabled={isLoading}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Button
            type="button"
            className="min-w-42.5"
            onClick={onAddUser}
            disabled={isLoading || !canAddUser}
          >
            Adicionar usuário
            <Plus className="size-4" />
          </Button>

          <label htmlFor="users-page-size" className="sr-only">
            Itens por página
          </label>
          <select
            id="users-page-size"
            className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            value={String(page_size)}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            disabled={isLoading}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

