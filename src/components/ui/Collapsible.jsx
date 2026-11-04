import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * A section that opens and closes from its heading — the heading is a button (`aria-expanded`) with a chevron, and a
 * short `summary` beside it keeps the gist in view while it's closed (e.g. "3 of 5 on").
 *
 * @param {React.ReactNode} title
 * @param {React.ReactNode} [summary]
 * @param {boolean} [defaultOpen]
 * @param {React.ReactNode} children
 * @param {string} [className]
 * @param {boolean} [forceOpen] — keep it open (e.g. while something inside has an error to show)
 */
export default function Collapsible({ title, summary, defaultOpen = true, children, className = '', forceOpen = false }) {
  const [chosen, setOpen] = useState(defaultOpen);
  const open = chosen || forceOpen;
  const panelId = useId();
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-lg text-left focus-ring"
      >
        <span className="font-heading text-ink text-base font-semibold">{title}</span>
        <span className="inline-flex items-center gap-2 text-xs text-muted">
          {summary}
          <ChevronDown size={18} aria-hidden="true" className={`text-icon transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      <div id={panelId} hidden={!open} className="flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}
