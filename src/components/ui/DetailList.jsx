import React from 'react';

/**
 * The one way to show "label: value" details (a booking's dates, route, locations, price; a handover's readings; an
 * audit entry's fields…). A real `<dl>` laid out as two columns: the labels in one, and every value starting at the
 * same line just beside them — left-aligned, never pushed to the far edge of the card — so a list reads straight down
 * like a form. A long value wraps inside its own column. Labels are the readable secondary grey, values near-black
 * and medium weight.
 *
 *   <DetailList>
 *     <DetailRow label="Dates">17 Oct 2026, 09:00 – 17:00</DetailRow>
 *     <DetailRow label="Pickup Location">Eastleigh</DetailRow>
 *     <DetailRow label="Notes" stacked>Long free text…</DetailRow>
 *   </DetailList>
 *
 * @param {'sm'|'xs'} [size] — text size (sm default; xs for dense places like a handover record)
 * @param {string} [className] — layout only
 */
export function DetailList({ size = 'sm', className = '', children }) {
  return (
    <dl
      className={`grid grid-cols-[minmax(0,max-content)_minmax(0,1fr)] gap-x-6 gap-y-2.5 ${
        size === 'xs' ? 'text-xs' : 'text-sm'
      } ${className}`}
    >
      {children}
    </dl>
  );
}

/**
 * One label and its value inside a `DetailList`. `stacked` puts the value under its label across the full width
 * (for free text such as notes). Renders nothing when `hidden` — handy for optional rows.
 *
 * @param {React.ReactNode} label
 * @param {boolean} [stacked]
 * @param {boolean} [hidden]
 * @param {boolean} [divider] — a line above the row, across both columns (e.g. before a Total)
 * @param {string} [valueClassName] — e.g. `font-mono` for an ID, `font-semibold` for a total; not for alignment
 */
export function DetailRow({ label, stacked = false, hidden = false, divider = false, valueClassName = '', children }) {
  if (hidden) return null;
  // The divider is drawn on both cells; the value cell reaches back over the column gap (-ml-6 pl-6) so the line is unbroken.
  const line = divider ? 'border-t border-black/10 pt-3' : '';
  return (
    <div className={stacked ? 'col-span-full flex flex-col gap-1' : 'contents'}>
      <dt className={`text-muted max-w-[12rem] ${line}`}>{label}</dt>
      <dd className={`text-ink font-medium min-w-0 break-words text-left ${divider ? `${line} -ml-6 pl-6` : ''} ${valueClassName}`}>{children}</dd>
    </div>
  );
}

export default DetailList;
