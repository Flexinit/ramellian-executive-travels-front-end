import React, { createContext, useContext } from 'react';

/** Whether the list's rows stay side by side on a phone (`DetailList inline`). */
const InlineRows = createContext(false);

/**
 * The one way to show "label: value" details (a booking's dates, route, locations, price; a handover's readings; an
 * audit entry's fields…) — as a small table: a real `<dl>` in two columns, the labels in the first and every value
 * left-aligned in the second (never pushed to the far edge), each label/value pair a row, the rows alternating white
 * and light grey (product owner, 2026-10-25), inside a thin outline with rounded corners. The columns line up across
 * all rows (CSS subgrid). A long value wraps inside its own cell. On a phone (below `sm`) each label sits above its
 * value instead, both full width — unless the list is `inline` (short pairs read better side by side: price lines).
 *
 *   <DetailList>
 *     <DetailRow label="Dates">17 Oct 2026, 09:00 – 17:00</DetailRow>
 *     <DetailRow label="Pickup Location">Eastleigh</DetailRow>
 *     <DetailRow label="Notes" stacked>Long free text…</DetailRow>
 *     <DetailRow label="Total" divider valueClassName="font-semibold">KES 12,000</DetailRow>
 *   </DetailList>
 *
 * @param {'sm'|'xs'} [size] — text size (sm default; xs for dense places like a handover record)
 * @param {boolean} [inline] — keep label and value side by side on phones too (price lines: short, amounts scanned)
 * @param {string} [className] — layout only
 */
export function DetailList({ size = 'sm', inline = false, className = '', children }) {
  return (
    <dl
      className={`grid grid-cols-[minmax(0,max-content)_minmax(0,1fr)] overflow-hidden rounded-tile border border-line ${
        size === 'xs' ? 'text-xs' : 'text-sm'
      } ${className}`}
    >
      <InlineRows.Provider value={inline}>{children}</InlineRows.Provider>
    </dl>
  );
}

/**
 * One row of a `DetailList`. `stacked` puts the value under its label across the full width (for free text such as
 * notes); `divider` draws a firmer line above the row (e.g. before a Total). Renders nothing when `hidden` — handy for
 * optional rows.
 *
 * @param {React.ReactNode} label
 * @param {boolean} [stacked]
 * @param {boolean} [hidden]
 * @param {boolean} [divider]
 * @param {string} [valueClassName] — e.g. `font-mono` for an ID, `font-semibold` for a total; not for alignment
 */
export function DetailRow({ label, stacked = false, hidden = false, divider = false, valueClassName = '', children }) {
  const inline = useContext(InlineRows);
  if (hidden) return null;
  const row = `col-span-full px-3 py-2 odd:bg-surface even:bg-subtle ${divider ? 'border-t border-line' : ''}`;
  return stacked ? (
    <div className={`${row} flex flex-col gap-1`}>
      <dt className="text-muted">{label}</dt>
      <dd className={`text-ink font-medium min-w-0 break-words text-left ${valueClassName}`}>{children}</dd>
    </div>
  ) : (
    // Phones: label above value, both full width — side by side, a long label ("Getting the vehicle") left the value a
    // narrow column five lines tall (seen on a phone set to large text). From sm up: the two-column table.
    <div className={`${row} ${inline ? 'grid grid-cols-subgrid items-baseline gap-x-6' : 'flex flex-col gap-0.5 sm:grid sm:grid-cols-subgrid sm:items-baseline sm:gap-x-6 sm:gap-y-0'}`}>
      <dt className={`text-muted ${inline ? 'max-w-[12rem]' : 'sm:max-w-[12rem]'}`}>{label}</dt>
      <dd className={`text-ink font-medium min-w-0 break-words text-left ${valueClassName}`}>{children}</dd>
    </div>
  );
}

export default DetailList;
