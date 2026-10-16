import React from 'react';
import Spinner from '../ui/Spinner';
import { useRentalTerms, groupRentalTerms } from '../../hooks/useRentalTerms';

/**
 * The platform's rental terms as renters read them (`GET /rental-terms` — the enabled ones, public), grouped by
 * category. Renders nothing while there are none, so pages can include it unconditionally.
 * @param {string} [className]
 */
export default function RentalTermsList({ className = '' }) {
  const { data: terms = [], isLoading } = useRentalTerms();
  if (isLoading) return <div className="flex justify-center py-6"><Spinner label="Loading the rental terms" /></div>;
  if (!terms.length) return null;

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {groupRentalTerms(terms).map(({ category, terms: list }) => (
        <section key={category} className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-brand-gold">{category}</h3>
          <dl className="flex flex-col gap-3">
            {list.map((t) => (
              <div key={t.id} className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <dt className="text-sm font-semibold text-brand-white">{t.title}</dt>
                <dd className="mt-1 text-sm text-brand-grey leading-relaxed whitespace-pre-line">{t.content}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
