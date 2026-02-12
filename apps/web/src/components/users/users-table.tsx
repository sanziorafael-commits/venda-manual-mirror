import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UserListItem } from "@/schemas/user";

type UsersTableProps = {
  data: UserListItem[];
  isLoading: boolean;
  isAdmin: boolean;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
  onEditUser: (user: UserListItem) => void;
  onDeleteUser: (user: UserListItem) => void;
};

const ROLE_LABEL_BY_VALUE: Record<UserListItem["role"], string> = {
  ADMIN: "Admin",
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

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }

  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }

  return value;
}

function buildPageList(currentPage: number, totalPages: number, maxPages = 7) {
  if (totalPages <= maxPages) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const sideSlots = Math.floor((maxPages - 1) / 2);
  const start = Math.max(
    0,
    Math.min(currentPage - sideSlots, totalPages - maxPages),
  );

  return Array.from({ length: maxPages }, (_, index) => start + index);
}

export function UsersTable({
  data,
  isLoading,
  isAdmin,
  pageIndex,
  pageSize,
  totalPages,
  onPageChange,
  onEditUser,
  onDeleteUser,
}: UsersTableProps) {
  const columns = React.useMemo<ColumnDef<UserListItem>[]>(() => {
    const baseColumns: ColumnDef<UserListItem>[] = [
      {
        accessorKey: "fullName",
        header: "Usuários",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.fullName}</span>
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
        cell: ({ row }) => formatPhone(row.original.phone),
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

    baseColumns.push({
      id: "details",
      header: "Ações",
      cell: ({ row }) => {
        const isDeleted = Boolean(row.original.deletedAt);

        return (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => onEditUser(row.original)}
              disabled={isLoading}
            >
              <Pencil className="size-3.5" />
              Editar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDeleteUser(row.original)}
              disabled={isDeleted || isLoading}
              aria-label={`Excluir usuário ${row.original.fullName}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      },
    });

    return baseColumns;
  }, [isAdmin, isLoading, onDeleteUser, onEditUser]);

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

  const canGoBack = pageIndex > 0;
  const canGoForward = pageIndex + 1 < totalPages;
  const pages = buildPageList(pageIndex, totalPages);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-[1020px] w-full border-collapse text-left text-sm">
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
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
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

      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canGoBack || isLoading}
            onClick={() => onPageChange(pageIndex - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {pages.map((page) => (
            <Button
              key={page}
              type="button"
              variant={page === pageIndex ? "default" : "ghost"}
              size="icon-sm"
              disabled={isLoading}
              onClick={() => onPageChange(page)}
            >
              {page + 1}
            </Button>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canGoForward || isLoading}
            onClick={() => onPageChange(pageIndex + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

