import React from 'react';

/**
 * Status pill badge.
 *
 * @param {string} label
 * @param {'success'|'warning'|'danger'|'info'|'neutral'|'gold'} variant
 * @param {'sm'|'lg'} [size] — sm (default) is the usual inline status pill; lg is bigger and bold, for a
 *   badge that needs to read as a stronger signal at a glance (e.g. "Booked" over a vehicle photo) rather
 *   than a quiet inline label.
 * @param {string} className
 */
export default function Badge({ label, variant = 'neutral', size = 'sm', className = '' }) {
  const variants = {
    success: 'bg-green-500/15 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    danger:  'bg-red-500/15 text-red-400 border-red-500/30',
    info:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
    neutral: 'bg-brand-grey/15 text-brand-grey border-brand-grey/30',
    gold:    'bg-brand-gold/15 text-brand-gold border-brand-gold/30',
  };
  const sizes = {
    sm: 'px-2 py-0.5 text-xs font-medium',
    lg: 'px-3 py-1 text-sm font-bold',
  };

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {label}
    </span>
  );
}
