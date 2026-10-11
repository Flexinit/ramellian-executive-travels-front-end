import React from 'react';

/**
 * @param {React.ComponentType} icon
 * @param {string} title
 * @param {string} description
 */
export default function TrustBadge({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-brand-gold/15 to-transparent border border-brand-gold/20 flex items-center justify-center">
        {Icon && <Icon size={18} className="text-brand-gold" aria-hidden="true" />}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <h3 className="text-brand-white text-sm font-semibold">{title}</h3>
        <p className="text-brand-grey text-xs leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
