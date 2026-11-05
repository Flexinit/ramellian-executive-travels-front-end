import { useEffect, useState } from 'react';

/**
 * Splits a list into pages, in the browser (for lists the backend returns whole). The page size starts at `pageSize`
 * and can be changed by the person (`setPageSize`, the **Per page** choice in `Pagination`), which goes back to page 1.
 *
 * @param {any[]} items
 * @param {number} [pageSize] — the default page size
 * @param {any} [resetKey] — when this changes (a search, a filter) the list goes back to page 1
 * @returns {{ page: number, setPage: (n: number) => void, pageSize: number, setPageSize: (n: number) => void, defaultPageSize: number, totalPages: number, pageItems: any[], from: number, to: number, total: number }}
 */
export function usePagination(items, pageSize = 10, resetKey) {
  const [requested, setPage] = useState(1);
  const [chosenSize, setChosenSize] = useState(null);
  const size = chosenSize || pageSize;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, requested), totalPages); // a page that no longer exists (the list shrank) becomes the last one

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  function setPageSize(n) {
    setChosenSize(n);
    setPage(1);
  }

  const start = (page - 1) * size;
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + size, total);
  return {
    page,
    setPage,
    pageSize: size,
    setPageSize,
    defaultPageSize: pageSize,
    totalPages,
    pageItems: items.slice(start, start + size),
    from,
    to,
    total,
    // Everything `Pagination` takes, Per page included: `<Pagination {...pager.props} noun="refunds" />`.
    props: { page, totalPages, onPage: setPage, from, to, total, pageSize: size, onPageSize: setPageSize, defaultPageSize: pageSize },
  };
}

/**
 * The same page controls for a list the backend pages (a Spring `Page`: `content`, `totalElements`, `totalPages`,
 * `number`, `size`). `request` goes into the query (`page` counts from 0 there); `propsFor(data)` gives `Pagination`
 * what it needs once the page has loaded.
 *
 * @param {number} [pageSize] — the default page size
 * @param {any} [resetKey] — when this changes (a search, a filter) the list goes back to the first page
 */
export function useServerPagination(pageSize = 10, resetKey) {
  const [page, setPage] = useState(1);
  const [chosenSize, setChosenSize] = useState(null);
  const size = chosenSize || pageSize;

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  function setPageSize(n) {
    setChosenSize(n);
    setPage(1);
  }

  function propsFor(data) {
    const total = Number(data?.totalElements) || 0;
    const totalPages = Math.max(1, Number(data?.totalPages) || Math.ceil(total / size) || 1);
    const shown = Math.min(page, totalPages);
    const start = (shown - 1) * size;
    return {
      page: shown,
      totalPages,
      onPage: setPage,
      from: total === 0 ? 0 : start + 1,
      to: Math.min(start + size, total),
      total,
      pageSize: size,
      onPageSize: setPageSize,
      defaultPageSize: pageSize,
    };
  }

  return { request: { page: page - 1, size }, page, setPage, pageSize: size, setPageSize, propsFor };
}
