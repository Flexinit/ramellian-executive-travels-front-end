import { useEffect, useState } from 'react';

/**
 * Splits a list into pages, in the browser (for lists the backend returns whole).
 *
 * @param {any[]} items
 * @param {number} [pageSize]
 * @param {any} [resetKey] — when this changes (a search, a filter) the list goes back to page 1
 * @returns {{ page: number, setPage: (n: number) => void, totalPages: number, pageItems: any[], from: number, to: number, total: number }}
 */
export function usePagination(items, pageSize = 10, resetKey) {
  const [requested, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requested), totalPages); // a page that no longer exists (the list shrank) becomes the last one

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const start = (page - 1) * pageSize;
  return {
    page,
    setPage,
    totalPages,
    pageItems: items.slice(start, start + pageSize),
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
    total,
  };
}
