import React from 'react';

/**
 * Generic surface card — dark background with subtle border.
 * Matches otto.rentals' clean card aesthetic on dark backgrounds.
 *
 * @param {React.ReactNode} children
 * @param {string} className — appended Tailwind classes
 */
export default function Card({ children, className = '', ...rest }) {
  return (
    <div
      className={`bg-brand-navy border border-white/8 rounded-xl shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
