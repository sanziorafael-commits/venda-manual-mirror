import * as React from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  CATEGORY_LABEL_BY_VALUE,
  type ProductListItem,
} from "@/schemas/product";

type ProductTableProps = {
  data: ProductListItem[];
  isLoading: boolean;
  canManageProducts: boolean;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (pageIndex: number) => void;
  onViewDetails: (product: ProductListItem) => void;
  onEditProduct: (product: ProductListItem) => void;
  onDeleteProduct: (product: ProductListItem) => void;
};

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCategories(values: string[]) {
  if (values.length === 0) {
    return "-";
  }

  const firstLabel = CATEGORY_LABEL_BY_VALUE[values[0]] ?? values[0];
  if (values.length === 1) {
    return firstLabel;
  }

  return `${firstLabel} +${values.length - 1}`;
}

export function ProductTable({
  data,
  isLoading,
  canManageProducts,
  pageIndex,
  pageSize,
  totalPages,
  onPageChange,
  onViewDetails,
  onEditProduct,
  onDeleteProduct,
}: ProductTableProps) {
  const columns = React.useMemo<ColumnDef<ProductListItem>[]>(() => {
    const baseColumns: ColumnDef<ProductListItem>[] = [
      {
        accessorKey: "nome",
        header: "Produto",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{row.original.nome}</span>
            <span className="text-xs text-muted-foreground">
              SKU: {row.original.codigoInternoSku ?? "-"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "marca",
        header: "Marca",
        cell: ({ row }) => row.original.marca ?? "-",
      },
      {
        accessorKey: "categorias",
        header: "Categoria",
        cell: ({ row }) => formatCategories(row.original.categorias),
      },
      {
        accessorKey: "totalObjecoes",
        header: "Objeções",
        cell: ({ row }) => row.original.totalObjecoes,
      },
      {
        accessorKey: "updatedAt",
        header: "Atualizado em",
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
      {
        id: "details",
        header: "Ações",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => onViewDetails(row.original)}
              disabled={isLoading}
            >
              <Eye className="size-3.5" />
              Ver detalhes
            </Button>
            {canManageProducts ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                  onClick={() => onEditProduct(row.original)}
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
                  onClick={() => onDeleteProduct(row.original)}
                  disabled={isLoading}
                  title={`Excluir produto ${row.original.nome}`}
                  aria-label={`Excluir produto ${row.original.nome}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            ) : null}
          </div>
        ),
      },
    ];

    return baseColumns;
  }, [canManageProducts, isLoading, onDeleteProduct, onEditProduct, onViewDetails]);

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
          <table className="min-w-[1040px] w-full border-collapse text-left text-sm">
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
                    Nenhum produto encontrado.
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
