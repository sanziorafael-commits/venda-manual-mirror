export const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;
export const DEFAULT_PAGE_SIZE: number = PAGE_SIZE_OPTIONS[0];

type PaginationMetaShape = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function createEmptyPaginationMeta<T extends PaginationMetaShape>(
  pageSize = DEFAULT_PAGE_SIZE,
): T {
  return {
    page: 1,
    pageSize,
    total: 0,
    totalPages: 1,
  } as T;
}

export function buildPageList(
  currentPage: number,
  totalPages: number,
  maxPages = 7,
) {
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
