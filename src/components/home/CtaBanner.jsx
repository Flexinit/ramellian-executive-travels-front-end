import React from 'react';
import { ArrowRight } from 'lucide-react';
import Button from '../ui/Button';

/**
 * Closing conversion banner — bold Ramellian-navy band, otto.rentals-style
 * strong final CTA before the footer.
 */
export default function CtaBanner() {
  return (
    <section className="bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="relative overflow-hidden rounded-3xl bg-brand-navy px-6 sm:px-12 py-12 sm:py-16 flex flex-col items-center text-center gap-5">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-brand-gold/20 blur-2xl"
          />
          <h2 className="relative font-heading text-on-accent text-3xl sm:text-4xl font-bold max-w-xl text-balance">
            Ready for your next executive journey?
          </h2>
          <p className="relative text-on-accent/70 text-sm sm:text-base max-w-md">
            Search our fleet and book a chauffeured or self-drive vehicle in minutes.
          </p>
          <Button to="/vehicles" variant="dark" size="lg" className="relative mt-1">
            Search Vehicles
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
