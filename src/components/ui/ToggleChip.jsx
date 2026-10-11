import React from 'react';

/**
 * A pill you switch on and off (a filter, a trip type, a booking mode). A gold
 * outline with a soft gold tint when on — the same look as the Button. Use this instead of hand-styling a `<button aria-pressed>`.
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
          ? 'bg-brand-gold/15 text-brand-gold border-brand-gold'
          : 'bg-transparent text-brand-grey border-white/10 hover:text-brand-gold hover:border-brand-gold/50'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
