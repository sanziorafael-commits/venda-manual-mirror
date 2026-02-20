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
import type { CompanyUserItem } from "@/schemas/company";

type CompanyUsersTableProps = {
  data: CompanyUserItem[];
  isLoading: boolean;
  actionUserId: string | null;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
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
  actionUserId,
  pageIndex,
  pageSize,
  totalPages,
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
        accessorKey: "fullName",
        header: "Usuários",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.fullName}
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
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <span
            className={
              row.original.isActive
                ? "inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                : "inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
            }
          >
            {row.original.isActive ? "Ativo" : "Inativo"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Ações",
        cell: ({ row }) => {
          const isDeleted = Boolean(row.original.deletedAt);
          const isInactive = !row.original.isActive;
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
                title={`Editar usuário ${row.original.fullName}`}
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
                  disabled={isLoading || isPendingAction}
                  title={`Reativar usuário ${row.original.fullName}`}
                  aria-label={`Reativar usuário ${row.original.fullName}`}
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
                  title={`Excluir usuário ${row.original.fullName}`}
                  aria-label={`Excluir usuário ${row.original.fullName}`}
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
      isLoading,
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
        pageSize,
      },
    },
    manualPagination: true,
    pageCount: totalPages,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-left text-sm">
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
                    { length: Math.max(4, Math.min(pageSize, 8)) },
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
        totalPages={totalPages}
        isLoading={isLoading}
        onPageChange={onPageChange}
      />
    </div>
  );
}
