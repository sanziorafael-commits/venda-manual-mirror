import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2, Mail, Pencil, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import type { CompanyUserItem } from "@/schemas/company";

type CompanyUsersTableProps = {
  data: CompanyUserItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  isBusy: boolean;
  actionUserId: string | null;
  pageIndex: number;
  page_size: number;
  total_pages: number;
  onPageChange: (pageIndex: number) => void;
  onEditUser: (user: CompanyUserItem) => void;
  canResendActivationForUser: (user: CompanyUserItem) => boolean;
  onResendActivation: (user: CompanyUserItem) => void;
  onReactivateUser: (user: CompanyUserItem) => void;
  onDeleteUser: (user: CompanyUserItem) => void;
};

const ROLE_LABEL_BY_VALUE: Record<CompanyUserItem["role"], string> = {
  ADMIN: "Admin",
  DIRETOR: "Diretor",
  GERENTE_COMERCIAL: "Gerente Comercial",
  SUPERVISOR: "Supervisor",
  VENDEDOR: "Vendedor",
};

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) {
    return value;
  }

  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

export function CompanyUsersTable({
  data,
  isLoading,
  isRefreshing,
  isBusy,
  actionUserId,
  pageIndex,
  page_size,
  total_pages,
  onPageChange,
  onEditUser,
  canResendActivationForUser,
  onResendActivation,
  onReactivateUser,
  onDeleteUser,
}: CompanyUsersTableProps) {
  const columns = React.useMemo<ColumnDef<CompanyUserItem>[]>(
    () => [
      {
        accessorKey: "full_name",
        header: "Usuários",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.full_name}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: "E-mail",
        cell: ({ row }) => row.original.email ?? "-",
      },
      {
        accessorKey: "cpf",
        header: "CPF",
        cell: ({ row }) => formatCpf(row.original.cpf),
      },
      {
        accessorKey: "role",
        header: "Cargo do usuário",
        cell: ({ row }) => ROLE_LABEL_BY_VALUE[row.original.role],
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={
              row.original.is_active
                ? "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                : "inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
            }
          >
            {row.original.is_active ? "Ativo" : "Inativo"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Ações",
        cell: ({ row }) => {
          const isDeleted = Boolean(row.original.deleted_at);
          const isInactive = !row.original.is_active;
          const isPendingAction = actionUserId === row.original.id;
          const canResendActivation = canResendActivationForUser(row.original);

          return (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => onEditUser(row.original)}
                disabled={isBusy || isPendingAction}
                title={`Editar usuário ${row.original.full_name}`}
              >
                <Pencil className="size-3.5" />
                Editar
              </Button>
              {canResendActivation ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700"
                  onClick={() => onResendActivation(row.original)}
                  disabled={isBusy || isPendingAction}
                  title={`Reenviar ativação`}
                  aria-label={`Reenviar ativação `}
                >
                  <Mail className="size-4" />
                </Button>
              ) : null}
              {isInactive ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-emerald-700 hover:bg-emerald-100 hover:text-emerald-700"
                  onClick={() => onReactivateUser(row.original)}
                  disabled={isBusy || isPendingAction}
                  title={`Reativar usuário ${row.original.full_name}`}
                  aria-label={`Reativar usuário ${row.original.full_name}`}
                >
                  <RotateCcw className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDeleteUser(row.original)}
                  disabled={isDeleted || isBusy || isPendingAction}
                  title={`Excluir usuário ${row.original.full_name}`}
                  aria-label={`Excluir usuário ${row.original.full_name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [
      actionUserId,
      isBusy,
      canResendActivationForUser,
      onDeleteUser,
      onEditUser,
      onResendActivation,
      onReactivateUser,
    ],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      pagination: {
        pageIndex,
        pageSize: page_size,
      },
    },
    manualPagination: true,
    pageCount: total_pages,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-xl border bg-card shadow-xs">
        {isRefreshing ? (
          <div className="pointer-events-none absolute right-3 top-2 z-10 inline-flex items-center gap-1 rounded-md border bg-background/95 px-2 py-1 text-[11px] text-muted-foreground shadow-xs">
            <Loader2 className="size-3 animate-spin" />
            Atualizando
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-245 w-full border-collapse text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 font-semibold">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {isLoading
                ? Array.from(
                    { length: Math.max(4, Math.min(page_size, 8)) },
                    (_, rowIndex) => (
                      <tr key={`loading-${rowIndex}`} className="border-t">
                        {columns.map((_, columnIndex) => (
                          <td
                            key={`loading-cell-${rowIndex}-${columnIndex}`}
                            className="px-4 py-4"
                          >
                            <div className="h-4 w-full animate-pulse rounded bg-muted" />
                          </td>
                        ))}
                      </tr>
                    ),
                  )
                : table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-4">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}

              {!isLoading && table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationControls
        pageIndex={pageIndex}
        total_pages={total_pages}
        isLoading={isBusy}
        onPageChange={onPageChange}
      />
    </div>
  );
}
