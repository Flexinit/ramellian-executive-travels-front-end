import React from 'react';

/**
 * @param {number} number — step number, e.g. 1
 * @param {string} title
 * @param {string} description
 */
export default function StepCard({ number, title, description }) {
  return (
    <div className="relative flex flex-col items-center text-center gap-4">
      <div className="relative z-10 w-14 h-14 rounded-full bg-brand-dark border-2 border-brand-gold flex items-center justify-center shadow-glow">
        <span className="font-heading text-brand-gold text-xl font-bold">{number}</span>
      </div>
      <div className="flex flex-col gap-1.5 max-w-xs">
        <h3 className="font-heading text-brand-white font-semibold">{title}</h3>
        <p className="text-brand-grey text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
