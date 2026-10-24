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
    success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    danger:  'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
    info:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30',
    neutral: 'bg-subtle text-muted border-line',
    gold:    'bg-accent text-on-accent border-accent',
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
