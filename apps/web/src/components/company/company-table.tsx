import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CompanyListItem } from "@/schemas/company";

type CompanyTableProps = {
  data: CompanyListItem[];
  isLoading: boolean;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
  onViewDetails: (company: CompanyListItem) => void;
};

function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14) {
    return value;
  }

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

function formatUsersCount(count: number) {
  return `${count} ${count === 1 ? "usuário" : "Usuários"}`;
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

export function CompanyTable({
  data,
  isLoading,
  pageIndex,
  pageSize,
  totalPages,
  onPageChange,
  onViewDetails,
}: CompanyTableProps) {
  const columns = React.useMemo<ColumnDef<CompanyListItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nome da Empresa",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: "cnpj",
        header: "CNPJ",
        cell: ({ row }) => formatCnpj(row.original.cnpj),
      },
      {
        accessorKey: "usersCount",
        header: "Usuários",
        cell: ({ row }) => formatUsersCount(row.original.usersCount),
      },
      {
        id: "details",
        header: "Detalhes",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => onViewDetails(row.original)}
          >
            Ver detalhes
          </Button>
        ),
      },
    ],
    [onViewDetails],
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

  const canGoBack = pageIndex > 0;
  const canGoForward = pageIndex + 1 < totalPages;
  const pages = buildPageList(pageIndex, totalPages);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full border-collapse text-left text-sm">
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
                    Nenhuma empresa encontrada.
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
              variant="ghost"
              className={
                page === pageIndex
                  ? "bg-[#212a38] text-white hover:bg-[#182130] hover:text-white"
                  : undefined
              }
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

