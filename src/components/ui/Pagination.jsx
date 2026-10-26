import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';
import PageSizeSelect, { pageSizeOptions } from './PageSizeSelect';

/** The page numbers to show: first, last, the current one and its neighbours, with `null` where numbers were skipped. */
export function pageWindow(page, totalPages) {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const numbers = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out = [];
  numbers.forEach((n, i) => {
    if (i > 0 && n - numbers[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

/**
 * Page controls for a list: "Showing 6–10 of 23", **Per page**, Previous / Next, and numbered pages. Renders nothing when
 * the list fits on one page even at the smallest size offered. Pair it with `usePagination` (its `pageSize`,
 * `setPageSize` and `defaultPageSize`); without `onPageSize` there's no Per page choice.
 *
 * @param {number} page — the current page, from 1
 * @param {number} totalPages
 * @param {(page: number) => void} onPage
 * @param {number} from — position of the first item shown
 * @param {number} to — position of the last item shown
 * @param {number} total — how many items in all
 * @param {string} [noun] — what the items are called, e.g. "vehicles"
 * @param {number} [pageSize] @param {(size: number) => void} [onPageSize] @param {number} [defaultPageSize]
 */
export default function Pagination({ page, totalPages, onPage, from, to, total, noun = 'items', pageSize, onPageSize, defaultPageSize }) {
  const sizes = onPageSize ? pageSizeOptions(defaultPageSize ?? pageSize) : [];
  if (totalPages <= 1 && !(sizes.length && total > sizes[0])) return null;

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted" aria-live="polite">
        Showing <span className="text-ink font-medium">{from}–{to}</span> of <span className="text-ink font-medium">{total}</span> {noun}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSize && <PageSizeSelect value={pageSize} onChange={onPageSize} defaultSize={defaultPageSize} />}
        {totalPages > 1 && (
          <>
            <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
              <ChevronLeft size={14} aria-hidden="true" />
              Previous
            </Button>
            <ul className="hidden sm:flex items-center gap-1" aria-label="Pages">
              {pageWindow(page, totalPages).map((n, i) =>
                n === null ? (
                  <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-muted">
                    …
                  </li>
                ) : n === page ? (
                  <li key={n}>
                    <span aria-current="page" aria-label={`Page ${n}, current page`} className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-accent px-2 text-sm font-semibold text-on-accent">
                      {n}
                    </span>
                  </li>
                ) : (
                  <li key={n}>
                    <Button size="sm" onClick={() => onPage(n)} aria-label={`Go to page ${n}`} className="!px-3">
                      {n}
                    </Button>
                  </li>
                )
              )}
            </ul>
            <span className="text-sm text-muted sm:hidden">
              Page {page} of {totalPages}
            </span>
            <Button size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">
              Next
              <ChevronRight size={14} aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
