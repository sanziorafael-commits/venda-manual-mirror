export function getPagination(page = 1, page_size = 10) {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize = Number.isFinite(page_size) && page_size > 0 ? Math.min(page_size, 100) : 10;

  return {
    page: safePage,
    page_size: safePageSize,
    skip: (safePage - 1) * safePageSize,
    take: safePageSize,
  };
}


