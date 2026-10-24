import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Button from './Button';

/**
 * One of a vehicle's features — the design system's "Car features" tile, made compact so a whole set reads at a
 * glance: the icon in a small white circle on the left, a short grey label and the value in bold beside it. When the
 * grid first appears each tile fades up, then a soft gold highlight passes over the tiles one after another — once,
 * to draw the eye across them — and they stay still. Under the pointer a tile lifts a touch and its icon turns gold. Use inside a `FeatureGrid`.
 *
 * @param {React.ComponentType} icon — a lucide icon (or TripModeIcons)
 * @param {string} label — e.g. "Capacity"
 * @param {React.ReactNode} value — e.g. "5 seats"
 * @param {number} [index] — set by FeatureGrid, for the staggered entrance
 */
export default function FeatureTile({ icon: Icon, label, value, index = 0 }) {
  return (
    <li
      // Fade-in, staggered; then the gold highlight sweeps across the tiles one by one, starting once they're all in.
      style={{ animationDelay: `${index * 70}ms, ${450 + index * 220}ms` }}
      className="group flex items-center gap-3 rounded-tile border border-transparent bg-subtle p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-gold/40 hover:bg-surface hover:shadow-card motion-safe:animate-tile-in"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors group-hover:border-brand-gold/60 group-hover:text-brand-gold-deep">
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[11px] text-muted">{label}</span>
        <span className="text-sm font-semibold text-ink break-words">{value}</span>
      </span>
    </li>
  );
}

/**
 * The grid that holds `FeatureTile`s — two across on a phone, three on a tablet, four on a wide screen. The tiles
 * fade up one after another when it first appears (once; skipped for anyone whose device asks for reduced motion).
 * With `initialCount`, only that many show at first, with a "Show all N features" button for the rest — so the
 * key features read at a glance and the full list is one click away. Put the most important tiles first.
 *
 * @param {string} label — accessible name of the list, e.g. "Car features"
 * @param {number} [initialCount] — how many to show before "Show all"; omit to show every tile
 */
export function FeatureGrid({ label, initialCount, children, className = '' }) {
  const tiles = React.Children.toArray(children).filter(Boolean);
  const [expanded, setExpanded] = useState(false);
  const collapsible = typeof initialCount === 'number' && tiles.length > initialCount;
  const shown = collapsible && !expanded ? tiles.slice(0, initialCount) : tiles;
  const listId = `${label.replace(/\s+/g, '-').toLowerCase()}-list`;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <ul id={listId} aria-label={label} className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
        {shown.map((tile, index) => React.cloneElement(tile, { index }))}
      </ul>
      {collapsible && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show fewer' : `Show all ${tiles.length} features`}
          <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </Button>
      )}
    </div>
  );
}
