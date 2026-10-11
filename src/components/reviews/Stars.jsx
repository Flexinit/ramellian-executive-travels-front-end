import React from 'react';
import { Star } from 'lucide-react';

/**
 * A row of five stars showing a rating out of 5 (rounded to the nearest whole star), readable by screen readers.
 * @param {number} rating
 * @param {number} [size]
 */
export function Stars({ rating = 0, size = 14 }) {
  const filled = Math.round(Math.max(0, Math.min(5, rating)));
  return (
    <span role="img" aria-label={`${rating} out of 5`} className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} aria-hidden="true" className={n <= filled ? 'fill-brand-gold text-brand-gold' : 'text-brand-grey/50'} />
      ))}
    </span>
  );
}

/**
 * Pick a rating from 1 to 5 stars (a radio group, so it works with a keyboard).
 * @param {number} value — 0 when nothing is chosen yet
 * @param {(n: number) => void} onChange
 */
export function StarPicker({ value, onChange, label = 'Your rating' }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium text-brand-white mb-1">{label}</legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer rounded-md p-0.5 focus-within:ring-2 focus-within:ring-brand-gold">
            <input type="radio" name="rating" value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`} />
            <Star size={26} aria-hidden="true" className={n <= value ? 'fill-brand-gold text-brand-gold' : 'text-brand-grey hover:text-brand-gold'} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
