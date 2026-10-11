import React from 'react';

/**
 * Accessible loading spinner.
 * @param {'sm'|'md'|'lg'} size
 * @param {string} label  — aria-label text
 * @param {string} color  — Tailwind border-color class override
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
      className={`${sizes[size]} inline-block rounded-full border-brand-gold/30 border-t-brand-gold animate-spin ${color}`}
    />
  );
}
