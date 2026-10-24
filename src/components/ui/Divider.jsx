import React from 'react';

/**
 * Horizontal rule with optional centred label.
 *
 * @param {string} label — optional text placed in the centre
 * @param {string} className
 */
export default function Divider({ label, className = '' }) {
  if (label) {
    return (
      <div role="separator" className={`flex items-center gap-3 ${className}`}>
        <div className="flex-1 h-px bg-ink/10" />
        <span className="text-xs text-muted font-medium px-1 select-none">{label}</span>
        <div className="flex-1 h-px bg-ink/10" />
      </div>
    );
  }

  return <hr className={`border-0 h-px bg-ink/10 ${className}`} />;
}
