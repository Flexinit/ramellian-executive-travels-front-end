import React from 'react';
import BookingBar from './BookingBar';
import HeroBackgroundSlideshow from './HeroBackgroundSlideshow';
import RotatingWord from '../ui/RotatingWord';

/** The headline's gold word, in turn — all about the same length, so the headline doesn't shift as they change. */
const HERO_WORDS = ['Reimagined', 'Redefined', 'Elevated', 'Effortless', 'Unrivalled', 'Perfected'];
/** How long each word stays — slow enough to be a gentle touch, not a distraction (product owner, 2026-10-26). */
const HERO_WORD_SECONDS = 5;

/**
 * otto.rentals-style search-first hero: bold editorial headline, short
 * subcopy, and the booking widget as the primary call to action, over a
 * crossfading background of the destinations Ramellian actually serves.
 */
export default function HeroSection() {
  return (
    <section className="relative bg-canvas">
      {/*
        Sibling absolute layer with its own overflow-hidden, not a wrapper
        around the content below — critically, this means overflow-hidden
        never sits on an ancestor of the booking bar's date-picker popover
        (also `position: absolute`), which would otherwise clip it.
      */}
      <HeroBackgroundSlideshow />

      <div className="relative site-width mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24 pb-14 sm:pb-16 flex flex-col items-center text-center gap-6">
        <span className="inline-flex items-center gap-2 text-brand-gold text-xs font-semibold tracking-widest uppercase">
          <span className="w-6 h-px bg-brand-gold" aria-hidden="true" />
          Chauffeur &amp; Self-Drive
          <span className="w-6 h-px bg-brand-gold" aria-hidden="true" />
        </span>

        <h1 className="font-heading text-white text-3xl sm:text-4xl lg:text-5xl font-bold [text-shadow:0_2px_12px_rgba(0,0,0,0.35)] leading-[1.15] max-w-2xl text-balance">
          {/* The gold word playfully swaps for related ones (RotatingWord); screen readers hear "Reimagined". */}
          Executive Travel, <RotatingWord words={HERO_WORDS} interval={HERO_WORD_SECONDS * 1000} className="text-brand-gold" />
        </h1>

        <p className="text-white/90 text-base max-w-xl leading-relaxed [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
          Chauffeured luxury and self-drive rentals, booked in minutes.
        </p>

        <div className="w-full max-w-6xl mt-4">
          <BookingBar />
        </div>
      </div>
    </section>
  );
}
