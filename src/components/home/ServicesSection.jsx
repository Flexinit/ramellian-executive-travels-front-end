import React from 'react';
import { Building2, Plane, PartyPopper, Route, Users, ShieldCheck } from 'lucide-react';
import ServiceCard from './ServiceCard';

/** Matches the Navbar Services dropdown — docs/menu-structure.md §3.2 */
const SERVICES = [
  { icon: Building2, title: 'Corporate Transport', description: 'Reliable daily transport for executives and teams, billed on your terms.' },
  { icon: Plane, title: 'Airport Transfers', description: 'Flight-tracked pickups at JKIA arrivals — never wait, never miss a flight.' },
  { icon: PartyPopper, title: 'Events & Weddings', description: 'Arrive in style for weddings, galas, and milestone celebrations.' },
  { icon: Route, title: 'Long-Distance Routes', description: 'Comfortable, chauffeured journeys beyond the city — safaris and upcountry trips.' },
  { icon: Users, title: 'Conferences & Business Meetings', description: 'Coordinated fleets for delegations, conferences, and multi-stop itineraries.' },
  { icon: ShieldCheck, title: 'Secure Journey Management', description: 'Vetted chauffeurs, tracked routes, and 24/7 oversight for sensitive travel.' },
];

export default function ServicesSection() {
  return (
    <section id="services" aria-labelledby="services-heading" className="bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="flex flex-col items-center text-center gap-1.5 mb-6 sm:mb-8">
          <span className="text-brand-gold-deep text-xs font-semibold tracking-widest uppercase">What We Offer</span>
          <h2 id="services-heading" className="font-heading text-ink text-2xl sm:text-3xl font-bold">
            Services Built for Every Journey
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((service, i) => (
            <ServiceCard key={service.title} {...service} index={String(i + 1).padStart(2, '0')} />
          ))}
        </div>
      </div>
    </section>
  );
}
