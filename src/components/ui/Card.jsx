import React from 'react';

/**
 * Generic surface card — the design system's white card: a hairline outline, 14px corners and a soft shadow.
 *
 * @param {React.ReactNode} children
 * @param {string} className — appended Tailwind classes
 */
export default function Card({ children, className = '', ...rest }) {
  return (
    <div
      className={`bg-surface border border-subtle rounded-card shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
