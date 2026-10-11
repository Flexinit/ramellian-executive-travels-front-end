import React from 'react';
import { ShieldCheck, CreditCard, Headset, FileCheck } from 'lucide-react';
import TrustBadge from './TrustBadge';

const TRUST_ITEMS = [
  { icon: ShieldCheck, title: 'Vetted Chauffeurs', description: 'Every driver background-checked and professionally trained.' },
  { icon: CreditCard, title: 'Secure Payments', description: 'Encrypted online checkout, no cash handling required.' },
  { icon: Headset, title: '24/7 Support', description: 'Real people on call for every trip, day or night.' },
  { icon: FileCheck, title: 'Fully Insured Fleet', description: 'Every vehicle covered, every journey protected.' },
];

export default function TrustSection() {
  return (
    <section aria-label="Why book with Ramellian" className="bg-brand-navy/40 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {TRUST_ITEMS.map((item) => (
            <TrustBadge key={item.title} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
