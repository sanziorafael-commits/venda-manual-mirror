import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import type { CompanyListItem } from "@/schemas/company";

type CompanyTableProps = {
  data: CompanyListItem[];
  isLoading: boolean;
  actionCompanyId: string | null;
  canDeleteCompanies: boolean;
  pageIndex: number;
  page_size: number;
  total_pages: number;
  onPageChange: (pageIndex: number) => void;
  onViewDetails: (company: CompanyListItem) => void;
  onDeleteCompany: (company: CompanyListItem) => void;
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

export function CompanyTable({
  data,
  isLoading,
  actionCompanyId,
  canDeleteCompanies,
  pageIndex,
  page_size,
  total_pages,
  onPageChange,
  onViewDetails,
  onDeleteCompany,
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
        accessorKey: "users_count",
        header: "Usuários",
        cell: ({ row }) => formatUsersCount(row.original.users_count),
      },
      {
        id: "actions",
        header: "Ações",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => onViewDetails(row.original)}
              disabled={isLoading || actionCompanyId === row.original.id}
            >
              Ver detalhes
            </Button>
            {canDeleteCompanies ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDeleteCompany(row.original)}
                disabled={isLoading || actionCompanyId === row.original.id}
                title={`Excluir empresa ${row.original.name}`}
                aria-label={`Excluir empresa ${row.original.name}`}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [actionCompanyId, canDeleteCompanies, isLoading, onDeleteCompany, onViewDetails],
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
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-180 w-full border-collapse text-left text-sm">
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
                    Nenhuma empresa encontrada.
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


