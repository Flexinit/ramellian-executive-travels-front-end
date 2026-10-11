import React from 'react';
import BookingBar from './BookingBar';
import HeroBackgroundSlideshow from './HeroBackgroundSlideshow';

/**
 * otto.rentals-style search-first hero: bold editorial headline, short
 * subcopy, and the booking widget as the primary call to action, over a
 * crossfading background of the destinations Ramellian actually serves.
 */
export default function HeroSection() {
  return (
    <section className="relative bg-brand-dark">
      {/*
        Sibling absolute layer with its own overflow-hidden, not a wrapper
        around the content below — critically, this means overflow-hidden
        never sits on an ancestor of the booking bar's date-picker popover
        (also `position: absolute`), which would otherwise clip it.
      */}
      <HeroBackgroundSlideshow />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-14 sm:pb-16 flex flex-col items-center text-center gap-6">
        <span className="inline-flex items-center gap-2 text-brand-gold text-xs font-semibold tracking-widest uppercase">
          <span className="w-6 h-px bg-brand-gold/60" aria-hidden="true" />
          Chauffeur &amp; Self-Drive
          <span className="w-6 h-px bg-brand-gold/60" aria-hidden="true" />
        </span>

        <h1 className="font-heading text-brand-white text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.15] max-w-2xl text-balance">
          Executive Travel, <span className="text-brand-gold">Reimagined</span>
        </h1>

        <p className="text-brand-grey text-base max-w-xl leading-relaxed">
          Chauffeured luxury and self-drive rentals, booked in minutes.
        </p>

        <div className="w-full max-w-6xl mt-4">
          <BookingBar />
        </div>
      </div>
    </section>
  );
}
