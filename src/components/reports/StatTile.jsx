import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import Skeleton from '../ui/Skeleton';

/**
 * One headline number: an icon, a label and a value (a skeleton while `loading`), optionally with a small line
 * of detail under it, and optionally a link to the page behind it.
 *
 * @param {React.ComponentType} icon
 * @param {string} label
 * @param {React.ReactNode} value
 * @param {boolean} [loading]
 * @param {string} [detail]
 * @param {string} [to]
 */
export default function StatTile({ icon: Icon, label, value, loading = false, detail, to }) {
  const tile = (
    <Card className="p-5 flex items-center gap-4 h-full">
      <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-accent" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-muted text-xs">{label}</p>
        {loading ? (
          <Skeleton className="w-16 h-6 mt-1" />
        ) : (
          <p className="font-heading text-ink text-xl sm:text-2xl font-bold truncate">{value}</p>
        )}
        {detail && !loading && <p className="text-muted text-xs mt-0.5">{detail}</p>}
      </div>
    </Card>
  );

  return to ? (
    <Link to={to} aria-label={`${label}: ${loading ? 'loading' : value}`} className="rounded-2xl focus-ring">
      {tile}
    </Link>
  ) : (
    tile
  );
}
