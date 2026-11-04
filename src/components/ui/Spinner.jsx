import React from 'react';

/**
 * Accessible loading spinner.
 * @param {'sm'|'md'|'lg'} size
 * @param {string} label  — aria-label text
 * @param {string} color  — Tailwind border-colour classes used instead of the accent (e.g. on an accent-filled button)
 */
export default function Spinner({ size = 'md', label = 'Loading', color = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-[3px]',
  };

  return (
    <span
      role="status"
      aria-label={label}
      // `color` replaces the accent colour rather than adding to it — two border colours would fight over the stylesheet's order.
      className={`${sizes[size]} inline-block rounded-full animate-spin ${color || 'border-accent/30 border-t-accent'}`}
    />
  );
}
