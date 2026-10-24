import React from 'react';

/**
 * A pill you switch on and off (a filter, a trip type, a booking mode). The design
 * system's filter pill: solid charcoal when on, white with a grey outline when off. Use this instead of hand-styling a `<button aria-pressed>`.
 *
 * @param {boolean} active — pressed state (also exposed as `aria-pressed`)
 * @param {function} onClick
 * @param {'sm'|'md'} size — sm for dense chip lists, md for the main choices
 * @param {string} className — layout only
 * @param {React.ReactNode} children
 */
export default function ToggleChip({ active = false, onClick, size = 'sm', className = '', children, ...rest }) {
  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs font-medium',
    md: 'px-4 py-2 text-sm font-semibold',
  };

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border transition-colors focus-ring ${sizes[size]} ${
        active
          ? 'bg-accent text-on-accent border-accent'
          : 'bg-surface text-ink border-line hover:border-accent'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
