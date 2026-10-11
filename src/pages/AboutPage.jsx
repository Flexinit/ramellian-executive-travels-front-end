import React from 'react';
import { ShieldCheck, Handshake, Sparkles } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageBackdrop from '../components/layout/PageBackdrop';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import executiveResidence from '../assets/destinations/executive-residence.webp';

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Reliability',
    description: 'On-time pickups, well-maintained vehicles, and chauffeurs who show up prepared — every time.',
  },
  {
    icon: Handshake,
    title: 'Trust',
    description: 'Vetted drivers, transparent pricing, and secure payments. No surprises, no hidden fees.',
  },
  {
    icon: Sparkles,
    title: 'Excellence',
    description: 'From the vehicle to the drive itself, every detail is held to an executive standard.',
  },
];

/** Company story and values (docs/requirements.md PUB-04). */
export default function AboutPage() {
  return (
    <PageBackdrop image={executiveResidence}>
      <PageWrapper>
        <PageTitle title="About Us" />
        <div className="flex flex-col gap-12">
          <div className="flex flex-col items-center text-center gap-2">
            <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">About Ramellian</span>
            <h1 className="font-heading text-brand-white text-3xl sm:text-4xl font-bold">Our Story</h1>
          </div>

          <div className="max-w-3xl mx-auto flex flex-col gap-4 text-brand-grey text-sm sm:text-base leading-relaxed">
            <p>
              Ramellian Executive Travels was founded to close a gap we kept running into ourselves: Nairobi had
              plenty of taxis and plenty of car rentals, but very few options that treated business travel,
              weddings, and family journeys with the same level of care an executive would expect anywhere else
              in the world.
            </p>
            <p>
              We started with a small fleet of carefully maintained vehicles and a simple promise — every pickup
              on time, every chauffeur vetted, every trip tracked from start to finish. That promise hasn&apos;t
              changed as we&apos;ve grown to serve corporate accounts, wedding parties, conference delegations, and
              travellers who’d simply rather self-drive on their own schedule.
            </p>
            <p>
              Today, Ramellian offers both chauffeured hire and self-drive rentals across Nairobi and beyond,
              backed by secure online payments and a support team that answers the phone.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-brand-white text-2xl font-bold text-center mb-6">What We Value</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {VALUES.map((value) => (
                <Card key={value.title} className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 border border-brand-gold/20 flex items-center justify-center">
                    <value.icon size={20} className="text-brand-gold" aria-hidden="true" />
                  </div>
                  <h3 className="font-heading text-brand-white font-semibold">{value.title}</h3>
                  <p className="text-brand-grey text-sm leading-relaxed">{value.description}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-3">
            <p className="text-brand-grey text-sm">Ready to travel with us?</p>
            <Button
              to="/vehicles"
            >
              Browse Our Fleet
            </Button>
          </div>
        </div>
      </PageWrapper>
    </PageBackdrop>
  );
}
