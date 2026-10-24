import React from 'react';

/**
 * Content placeholder skeleton with shimmer animation.
 *
 * @param {boolean} rounded — use rounded-full (for avatars)
 * @param {string} className — width, height etc via Tailwind
 */
export default function Skeleton({ rounded = false, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-black/8 ${rounded ? 'rounded-full' : 'rounded-md'} ${className}`}
    />
  );
}
