import React from 'react';
import { getInitials } from '../../lib/utils';

/**
 * User avatar — shows photo if src provided, otherwise initials fallback.
 *
 * @param {string} name
 * @param {string} src
 * @param {'sm'|'md'|'lg'|'xl'} size
 * @param {string} className
 */
export default function Avatar({ name = '', src, size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-2xl',
  };

  const base = `inline-flex items-center justify-center rounded-full bg-brand-gold/20 border border-brand-gold/40 font-semibold text-brand-gold overflow-hidden shrink-0 ${sizes[size]} ${className}`;

  if (src) {
    return (
      <div className={base}>
        <img src={src} alt={name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
      </div>
    );
  }

  return (
    <div className={base} aria-label={name}>
      <span>{getInitials(name)}</span>
    </div>
  );
}
