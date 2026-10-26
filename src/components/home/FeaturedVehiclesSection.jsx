import React from 'react';
import VehicleRow from './VehicleRow';

const ROWS = [
  { title: 'Available now', filters: {} },
  { title: 'Just added', filters: { sort: 'newest' } },
  { title: 'Chauffeured', filters: { chauffeured: true } },
  { title: 'Self-Drive', filters: { selfDrive: true } },
];

/**
 * Real vehicles on the landing page, a swipeable row per kind — so a visitor sees cars and prices straight
 * away instead of having to search first. Replaced the old "Our Fleet" section, which only listed model names.
 * A row with no vehicles hides itself (VehicleRow).
 */
export default function FeaturedVehiclesSection() {
  return (
    <section id="fleet" aria-labelledby="featured-heading" className="bg-surface">
      <div className="site-width mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-8">
        <div className="flex flex-col items-center text-center gap-1.5">
          <span className="text-brand-gold-deep text-xs font-semibold tracking-widest uppercase">Our Fleet</span>
          <h2 id="featured-heading" className="font-heading text-ink text-2xl sm:text-3xl font-bold">
            A Vehicle for Every Occasion
          </h2>
        </div>
        {ROWS.map((row) => (
          <VehicleRow key={row.title} title={row.title} filters={row.filters} />
        ))}
      </div>
    </section>
  );
}
