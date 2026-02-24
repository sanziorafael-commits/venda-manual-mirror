import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAGE_SIZE_OPTIONS } from "@/lib/pagination";

type CompanyUsersFilterFormProps = {
  searchValue: string;
  page_size: number;
  isLoading: boolean;
  onSearchValueChange: (value: string) => void;
  onPageSizeChange: (page_size: number) => void;
  onSubmit: () => void;
  onAddUser: () => void;
};

export function CompanyUsersFilterForm({
  searchValue,
  page_size,
  isLoading,
  onSearchValueChange,
  onPageSizeChange,
  onSubmit,
  onAddUser,
}: CompanyUsersFilterFormProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <form
        className="flex w-full max-w-2xl flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor="company-users-search" className="text-sm font-medium">
          Buscar por usuário
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="company-users-search"
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

      <div className="flex items-end gap-2">
        <Button
          type="button"
          className="hidden bg-emerald-600 text-white hover:bg-emerald-700 lg:inline-flex"
          onClick={onAddUser}
          disabled={isLoading}
        >
          Adicionar usuário
          <Plus className="size-4" />
        </Button>

        <div className="flex flex-col gap-1">
          <label htmlFor="company-users-page-size" className="text-sm font-medium">
            Itens
          </label>
          <select
            id="company-users-page-size"
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


