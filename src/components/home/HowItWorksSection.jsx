import React from 'react';
import StepCard from './StepCard';

const STEPS = [
  { number: 1, title: 'Choose Your Vehicle & Dates', description: 'Search by location, date, and travel mode to find the right fit from our fleet.' },
  { number: 2, title: 'Confirm & Pay Securely', description: 'Review your contract and pay safely online — no cash, no hassle.' },
  { number: 3, title: 'Enjoy Your Executive Ride', description: 'Your vehicle or chauffeur arrives on time, every time, tracked start to finish.' },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="bg-canvas">
      <div className="site-width mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex flex-col items-center text-center gap-1.5 mb-8 sm:mb-10">
          <span className="text-brand-gold-deep text-xs font-semibold tracking-widest uppercase">How It Works</span>
          <h2 id="how-it-works-heading" className="font-heading text-ink text-2xl sm:text-3xl font-bold">
            Booking in Three Simple Steps
          </h2>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-6">
          <div
            aria-hidden="true"
            className="hidden sm:block absolute top-7 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
          />
          {STEPS.map((step) => (
            <StepCard key={step.number} {...step} />
          ))}
        </div>
      </div>
    </section>
  );
}
