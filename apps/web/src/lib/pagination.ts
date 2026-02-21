export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;
export const DEFAULT_PAGE_SIZE: number = PAGE_SIZE_OPTIONS[0];

type PaginationMetaShape = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

export function createEmptyPaginationMeta<T extends PaginationMetaShape>(
  page_size = DEFAULT_PAGE_SIZE,
): T {
  return {
    page: 1,
    page_size,
    total: 0,
    total_pages: 1,
  } as T;
}

export function buildPageList(
  currentPage: number,
  total_pages: number,
  maxPages = 7,
) {
  if (total_pages <= maxPages) {
    return Array.from({ length: total_pages }, (_, index) => index);
  }

  const sideSlots = Math.floor((maxPages - 1) / 2);
  const start = Math.max(
    0,
    Math.min(currentPage - sideSlots, total_pages - maxPages),
  );

  return Array.from({ length: maxPages }, (_, index) => start + index);
}

