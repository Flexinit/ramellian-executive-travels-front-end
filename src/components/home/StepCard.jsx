import React from 'react';

/**
 * @param {number} number — step number, e.g. 1
 * @param {string} title
 * @param {string} description
 */
export default function StepCard({ number, title, description }) {
  return (
    <div className="relative flex flex-col items-center text-center gap-4">
      <div className="relative z-10 w-14 h-14 rounded-full bg-canvas border-2 border-accent flex items-center justify-center">
        <span className="font-heading text-accent text-xl font-bold">{number}</span>
      </div>
      <div className="flex flex-col gap-1.5 max-w-xs">
        <h3 className="font-heading text-ink font-semibold">{title}</h3>
        <p className="text-muted text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
