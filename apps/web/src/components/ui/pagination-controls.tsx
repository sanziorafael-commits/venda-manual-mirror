"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { buildPageList } from "@/lib/pagination";

import { Button } from "./button";

type PaginationControlsProps = {
  pageIndex: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (pageIndex: number) => void;
  previousLabel?: string;
  nextLabel?: string;
};

export function PaginationControls({
  pageIndex,
  totalPages,
  isLoading = false,
  onPageChange,
  previousLabel = "Pagina anterior",
  nextLabel = "Proxima pagina",
}: PaginationControlsProps) {
  const canGoBack = pageIndex > 0;
  const canGoForward = pageIndex + 1 < totalPages;
  const pages = buildPageList(pageIndex, totalPages);

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={!canGoBack || isLoading}
          onClick={() => onPageChange(pageIndex - 1)}
          aria-label={previousLabel}
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
          aria-label={nextLabel}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
