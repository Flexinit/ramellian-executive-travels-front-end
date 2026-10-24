import React from 'react';
import Spinner from '../ui/Spinner';
import { useRentalTerms, groupRentalTerms } from '../../hooks/useRentalTerms';

/**
 * The platform's rental terms as renters read them (`GET /rental-terms` — the enabled ones, public), grouped by
 * category (who they apply to: Everyone, Renters, Owners). Renders nothing (or `empty`) while there are none, so
 * pages can include it unconditionally.
 * @param {string[]} [audiences] — only these categories (e.g. ['Everyone', 'Renters']); all when omitted
 * @param {React.ReactNode} [empty]
 * @param {string} [className]
 */
export default function RentalTermsList({ audiences, empty = null, className = '' }) {
  const { data: all = [], isLoading } = useRentalTerms();
  const terms = audiences ? all.filter((t) => audiences.includes((t.category || '').trim() || 'Everyone')) : all;
  if (isLoading) return <div className="flex justify-center py-6"><Spinner label="Loading the rental terms" /></div>;
  if (!terms.length) return empty;

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {groupRentalTerms(terms).map(({ category, terms: list }) => (
        <section key={category} className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-gold-deep">{category}</h3>
          <dl className="flex flex-col gap-3">
            {list.map((t) => (
              <div key={t.id} className="rounded-xl bg-black/5 border border-black/10 px-4 py-3">
                <dt className="text-sm font-semibold text-ink">{t.title}</dt>
                <dd className="mt-1 text-sm text-muted leading-relaxed whitespace-pre-line">{t.content}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
