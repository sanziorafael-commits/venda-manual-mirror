import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Mail, Pencil, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { formatPhoneDisplay } from "@/lib/phone";
import type { UserListItem } from "@/schemas/user";

type UsersTableProps = {
  data: UserListItem[];
  isLoading: boolean;
  actionUserId: string | null;
  isAdmin: boolean;
  canManageUsers: boolean;
  pageIndex: number;
  page_size: number;
  total_pages: number;
  onPageChange: (pageIndex: number) => void;
  onEditUser: (user: UserListItem) => void;
  canResendActivationForUser: (user: UserListItem) => boolean;
  onResendActivation: (user: UserListItem) => void;
  onReactivateUser: (user: UserListItem) => void;
  onDeleteUser: (user: UserListItem) => void;
};

const ROLE_LABEL_BY_VALUE: Record<UserListItem["role"], string> = {
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

export function UsersTable({
  data,
  isLoading,
  actionUserId,
  isAdmin,
  canManageUsers,
  pageIndex,
  page_size,
  total_pages,
  onPageChange,
  onEditUser,
  canResendActivationForUser,
  onResendActivation,
  onReactivateUser,
  onDeleteUser,
}: UsersTableProps) {
  const columns = React.useMemo<ColumnDef<UserListItem>[]>(() => {
    const baseColumns: ColumnDef<UserListItem>[] = [
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
        accessorKey: "cpf",
        header: "CPF",
        cell: ({ row }) => formatCpf(row.original.cpf),
      },
      {
        accessorKey: "email",
        header: "E-mail",
        cell: ({ row }) => row.original.email ?? "-",
      },
      {
        accessorKey: "phone",
        header: "Celular",
        cell: ({ row }) => formatPhoneDisplay(row.original.phone),
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
    ];

    if (isAdmin) {
      baseColumns.push({
        id: "company",
        header: "Empresa",
        cell: ({ row }) =>
          row.original.company?.name ??
          (row.original.role === "ADMIN" ? "Plataforma" : "-"),
      });
    }

    if (canManageUsers) {
      baseColumns.push({
        id: "details",
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
                disabled={isLoading || isPendingAction}
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
                  disabled={isLoading || isPendingAction}
                  title={`Reenviar ativação`}
                  aria-label={`Reenviar ativação`}
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
                  disabled={isLoading || isPendingAction}
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
                  disabled={isDeleted || isLoading || isPendingAction}
                  title={`Excluir usuário ${row.original.full_name}`}
                  aria-label={`Excluir usuário ${row.original.full_name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          );
        },
      });
    }

    return baseColumns;
  }, [
    actionUserId,
    canManageUsers,
    isAdmin,
    isLoading,
    canResendActivationForUser,
    onDeleteUser,
    onEditUser,
    onResendActivation,
    onReactivateUser,
  ]);

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
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-255 w-full border-collapse text-left text-sm">
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
        isLoading={isLoading}
        onPageChange={onPageChange}
      />
    </div>
  );
}


