import React from 'react';
import { formatCurrency } from '../../lib/utils';

/**
 * Formatted KES price with period label.
 * Mirrors otto.rentals' bold price-per-day display on vehicle cards.
 *
 * @param {number} amount
 * @param {string} period — e.g. "/ day" (default) or "/ trip"
 * @param {'sm'|'md'|'lg'} size
 * @param {string} className
 */
export default function PriceDisplay({ amount, period = '/ day', size = 'md', className = '' }) {
  const sizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  return (
    <div className={`flex items-baseline gap-1.5 ${className}`}>
      <span className={`font-heading font-bold text-brand-gold ${sizes[size]}`}>
        {formatCurrency(amount)}
      </span>
      <span className="text-xs text-brand-grey font-body">{period}</span>
    </div>
  );
}
