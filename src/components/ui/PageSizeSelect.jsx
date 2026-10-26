import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

const STANDARD_SIZES = [10, 25, 50, 100];

/** The sizes offered: the standard ones plus the list's own default (e.g. 5 or 12), smallest first. */
export function pageSizeOptions(defaultSize) {
  return [...new Set([...(defaultSize ? [defaultSize] : []), ...STANDARD_SIZES])].sort((a, b) => a - b);
}

/**
 * "Per page" — how many items a list shows on each page. Used by `Pagination` and by lists paged by the backend.
 *
 * @param {number} value — the current page size
 * @param {(size: number) => void} onChange
 * @param {number} [defaultSize] — the list's own default, offered alongside 10/25/50/100
 */
export default function PageSizeSelect({ value, onChange, defaultSize }) {
  const id = useId();
  return (
    <div className="inline-flex items-center gap-2 text-sm text-muted">
      <label htmlFor={id}>Per page</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-8 appearance-none rounded-full border border-line bg-surface pl-3 pr-8 text-sm text-ink cursor-pointer hover:border-accent/60 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        >
          {pageSizeOptions(defaultSize ?? value).map((n) => (
            <option key={n} value={n} className="bg-surface">{n}</option>
          ))}
        </select>
        <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-icon" />
      </div>
    </div>
  );
}
