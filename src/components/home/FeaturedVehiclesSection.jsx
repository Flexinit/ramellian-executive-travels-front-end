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
    <section id="fleet" aria-labelledby="featured-heading" className="bg-brand-navy/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex flex-col gap-8">
        <div className="flex flex-col items-center text-center gap-1.5">
          <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">Our Fleet</span>
          <h2 id="featured-heading" className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">
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
