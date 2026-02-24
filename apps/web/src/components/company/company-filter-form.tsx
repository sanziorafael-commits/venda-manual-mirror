import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";

type CompanyFilterFormProps = {
  searchValue: string;
  page_size: number;
  isLoading: boolean;
  onSearchValueChange: (value: string) => void;
  onPageSizeChange: (page_size: number) => void;
  onSubmit: () => void;
  onAddCompany: () => void;
};

export function CompanyFilterForm({
  searchValue,
  page_size,
  isLoading,
  onSearchValueChange,
  onPageSizeChange,
  onSubmit,
  onAddCompany,
}: CompanyFilterFormProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <form
        className="flex w-full max-w-2xl flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor="company-search" className="text-sm font-medium">
          Buscar empresa
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="company-search"
            value={searchValue}
            placeholder="Digite o nome da empresa"
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
          className="min-w-42.5"
          onClick={onAddCompany}
          disabled={isLoading}
        >
          Adicionar empresa
          <Plus className="size-4" />
        </Button>

        <label htmlFor="company-page-size" className="sr-only">
          Itens por página
        </label>
        <select
          id="company-page-size"
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
  );
}


