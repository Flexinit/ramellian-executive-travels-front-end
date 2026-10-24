import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import DropdownMenu from './DropdownMenu';

/**
 * A single top-level nav item. Renders as a plain `<Link>`, or — when
 * `dropdown` items are supplied — as a button that toggles a `DropdownMenu`
 * panel beneath it. Highlights itself when the current route matches `to`.
 *
 * @param {string} to
 * @param {string} label
 * @param {Array<{label: string, to: string}>} [dropdown]
 * @param {string} activeClassName
 * @param {string} className
 */
export default function NavLink({
  to,
  label,
  dropdown,
  activeClassName = 'text-accent font-semibold border-b-2 border-accent',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isActive = to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);

  const base = 'font-body text-sm font-medium pb-1 transition-colors focus-ring rounded-sm';
  const stateClass = isActive ? activeClassName : 'text-muted hover:text-ink border-b-2 border-transparent';

  if (!dropdown || dropdown.length === 0) {
    return (
      <Link to={to} className={`${base} ${stateClass} ${className}`}>
        {label}
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${base} ${stateClass} ${className} inline-flex items-center gap-1`}
      >
        {label}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <DropdownMenu isOpen={open} onClose={() => setOpen(false)} items={dropdown} />
    </div>
  );
}
