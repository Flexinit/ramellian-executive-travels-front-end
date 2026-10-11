import React from 'react';
import Card from '../ui/Card';

/**
 * @param {React.ComponentType} icon — lucide-react icon component
 * @param {string} title
 * @param {string} description
 * @param {string} index — display index, e.g. "01"
 */
export default function ServiceCard({ icon: Icon, title, description, index }) {
  return (
    <Card className="relative overflow-hidden p-6 flex flex-col gap-4 hover:border-brand-gold/40 hover:-translate-y-1 transition-all duration-300 group">
      <span
        aria-hidden="true"
        className="absolute -top-3 -right-1 font-heading text-6xl font-bold text-white/[0.04] select-none group-hover:text-brand-gold/[0.06] transition-colors duration-300"
      >
        {index}
      </span>

      <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 border border-brand-gold/20 flex items-center justify-center">
        {Icon && <Icon size={20} className="text-brand-gold" aria-hidden="true" />}
      </div>
      <div className="relative flex flex-col gap-1.5">
        <h3 className="font-heading text-brand-white font-semibold">{title}</h3>
        <p className="text-brand-grey text-sm leading-relaxed">{description}</p>
      </div>
    </Card>
  );
}
