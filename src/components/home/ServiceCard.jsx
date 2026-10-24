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
    <Card className="relative overflow-hidden p-6 flex flex-col gap-4 hover:border-brand-gold/50 hover:-translate-y-1 transition-all duration-300 group">
      <span
        aria-hidden="true"
        className="absolute -top-3 -right-1 font-heading text-6xl font-bold text-brand-gold/20 select-none group-hover:text-brand-gold/40 transition-colors duration-300"
      >
        {index}
      </span>

      <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
        {Icon && <Icon size={20} className="text-accent" aria-hidden="true" />}
      </div>
      <div className="relative flex flex-col gap-1.5">
        <h3 className="font-heading text-ink font-semibold">{title}</h3>
        <p className="text-muted text-sm leading-relaxed">{description}</p>
      </div>
    </Card>
  );
}
