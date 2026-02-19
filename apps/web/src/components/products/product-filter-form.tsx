import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";

type ProductFilterFormProps = {
  searchValue: string;
  pageSize: number;
  isLoading: boolean;
  canAddProduct: boolean;
  onSearchValueChange: (value: string) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSubmit: () => void;
  onAddProduct: () => void;
};

export function ProductFilterForm({
  searchValue,
  pageSize,
  isLoading,
  canAddProduct,
  onSearchValueChange,
  onPageSizeChange,
  onSubmit,
  onAddProduct,
}: ProductFilterFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <form
          className="flex w-full max-w-3xl flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label htmlFor="products-search" className="text-sm font-medium">
            Buscar produto
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="products-search"
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

        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="min-w-[180px]"
            onClick={onAddProduct}
            disabled={isLoading || !canAddProduct}
          >
            Adicionar produto
            <Plus className="size-4" />
          </Button>

          <label htmlFor="products-page-size" className="sr-only">
            Itens por página
          </label>
          <select
            id="products-page-size"
            className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            value={String(pageSize)}
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
