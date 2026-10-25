import React from 'react';
import { SearchX } from 'lucide-react';
import Button from './Button';

/**
 * Zero-results / no-data empty state block.
 *
 * @param {React.ReactNode} icon — custom icon component (defaults to SearchX)
 * @param {string} title
 * @param {string} description
 * @param {{ label: string, onClick?: function, to?: string }} action — a button, or a link with `to`
 */
export default function EmptyState({ icon, title, description, action }) {
  const Icon = icon || SearchX;
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
        <Icon size={28} className="text-accent" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-lg font-semibold text-ink">{title}</h3>
        {description && (
          <p data-testid="empty-description" className="text-sm text-muted max-w-xs">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button size="sm" onClick={action.onClick} to={action.to}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
