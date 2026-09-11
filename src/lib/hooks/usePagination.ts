import { useState, useCallback } from "react";

const PAGE_SIZE = 50;

export function usePagination(initialPage = 0) {
  const [page, setPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  const next = useCallback(() => setPage((p) => p + 1), []);
  const prev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const goTo = useCallback((p: number) => setPage(Math.max(0, p)), []);
  const reset = useCallback(() => { setPage(0); setTotalCount(0); }, []);

  return {
    page,
    from,
    to,
    PAGE_SIZE,
    totalCount,
    setTotalCount,
    totalPages,
    hasNext,
    hasPrev,
    next,
    prev,
    goTo,
    reset,
  };
}
