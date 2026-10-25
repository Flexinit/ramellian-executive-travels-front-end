import React, { useEffect, useRef } from 'react';

/**
 * A pill-shaped "pick one of a few" switch (booking mode, fleet tier…). One is
 * always selected; the selected one is the solid charcoal pill (the design
 * system's "Filter Cars Type" switch). Use this instead of hand-styling a
 * row of buttons. On a narrow screen a row too long to fit scrolls sideways inside its own pill instead of
 * widening the page.
 *
 * @param {{ value: any, label: string, icon?: React.ComponentType }[]} options — `icon` (optional) shows before the label
 * @param {any} value — the selected option's value
 * @param {(value: any) => void} onChange
 * @param {string} label — accessible name of the group
 * @param {'radio'|'tab'} kind — `radio` for a form choice, `tab` when it switches what's shown
 * @param {'sm'|'md'} size
 * @param {string} className — layout only
 */
export default function SegmentedControl({ options, value, onChange, label, kind = 'radio', size = 'md', className = '' }) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs whitespace-nowrap',
    md: 'px-5 py-2 text-sm',
  };
  const isRadio = kind === 'radio';

  // On a phone the options can be wider than the screen (the control then scrolls sideways): keep the chosen one in
  // view, so it never starts off the edge, cut in half. Only the control scrolls — never the page.
  const track = useRef(null);
  useEffect(() => {
    const el = track.current;
    const chosen = el?.querySelector('[aria-checked="true"], [aria-selected="true"]');
    if (!el || !chosen || el.scrollWidth <= el.clientWidth) return;
    const left = chosen.offsetLeft - el.offsetLeft;
    if (left < el.scrollLeft || left + chosen.offsetWidth > el.scrollLeft + el.clientWidth) {
      el.scrollLeft = Math.max(0, left - (el.clientWidth - chosen.offsetWidth) / 2);
    }
  }, [value]);

  return (
    <div
      ref={track}
      role={isRadio ? 'radiogroup' : 'tablist'}
      aria-label={label}
      className={`inline-flex rounded-full bg-surface border border-line p-1 w-fit max-w-full overflow-x-auto no-scrollbar ${className}`}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={String(opt.value ?? 'all')}
            type="button"
            role={isRadio ? 'radio' : 'tab'}
            {...(isRadio ? { 'aria-checked': selected } : { 'aria-selected': selected })}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center justify-center gap-1.5 shrink-0 font-semibold rounded-full border transition-colors focus-ring ${sizes[size]} ${
              selected ? 'bg-accent text-on-accent border-accent' : 'border-transparent text-ink hover:bg-subtle'
            }`}
          >
            {opt.icon && <opt.icon size={size === 'sm' ? 14 : 16} aria-hidden="true" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
