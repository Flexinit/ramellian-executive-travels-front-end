import React from 'react';
import { Building2, Plane, PartyPopper, Route, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

/**
 * Anchor ids must match the Navbar/Footer Services dropdown links
 * (docs/menu-structure.md §3.2, §7): #corporate, #airport, #weddings,
 * #long-distance, #conferences, #secure.
 */
const SERVICES = [
  {
    id: 'corporate',
    icon: Building2,
    title: 'Corporate Transport',
    summary: 'Reliable daily transport for executives and teams, billed on your terms.',
    details:
      'From single-executive pickups to coordinated multi-vehicle staff transport, we run on your schedule with monthly billing available for corporate accounts. Every driver is vetted and briefed on your visitors’ itinerary in advance.',
  },
  {
    id: 'airport',
    icon: Plane,
    title: 'Airport Transfers',
    summary: 'Flight-tracked pickups at JKIA arrivals — never wait, never miss a flight.',
    details:
      'We track your flight in real time, so your chauffeur adjusts for early or delayed arrivals automatically. Meet-and-greet at arrivals with a name board is included on every airport transfer.',
  },
  {
    id: 'weddings',
    icon: PartyPopper,
    title: 'Events & Weddings',
    summary: 'Arrive in style for weddings, galas, and milestone celebrations.',
    details:
      'Decorated executive vehicles, coordinated bridal party convoys, and precise timing around your event schedule — including cake and gift transportation on request.',
  },
  {
    id: 'long-distance',
    icon: Route,
    title: 'Long-Distance Routes',
    summary: 'Comfortable, chauffeured journeys beyond the city — safaris and upcountry trips.',
    details:
      'Experienced long-haul chauffeurs, well-maintained vehicles, and flexible multi-day itineraries for safaris, coastal getaways, and upcountry travel.',
  },
  {
    id: 'conferences',
    icon: Users,
    title: 'Conferences & Business Meetings',
    summary: 'Coordinated fleets for delegations, conferences, and multi-stop itineraries.',
    details:
      'We manage fleets of vehicles for delegations and conference logistics, with a single point of contact coordinating pickups, waiting times, and multi-stop schedules.',
  },
  {
    id: 'secure',
    icon: ShieldCheck,
    title: 'Secure Journey Management',
    summary: 'Vetted chauffeurs, tracked routes, and 24/7 oversight for sensitive travel.',
    details:
      'For clients who need an added layer of assurance: background-checked chauffeurs, live route tracking, and round-the-clock coordination with our operations desk.',
  },
];

/** Detailed service descriptions, anchored for the Navbar/Footer dropdown links (docs/requirements.md PUB-02). */
export default function ServicesPage() {
  return (
    <PageWrapper>
      <PageTitle title="Our Services" />
      <div className="flex flex-col gap-10">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-brand-gold text-xs font-semibold tracking-widest uppercase">What We Offer</span>
          <h1 className="font-heading text-brand-white text-3xl sm:text-4xl font-bold">Our Services</h1>
          <p className="text-brand-grey text-sm max-w-xl">
            Six ways Ramellian gets you where you need to be — chauffeured or self-drive.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          {SERVICES.map((service) => (
            <Card
              key={service.id}
              id={service.id}
              className="scroll-mt-24 p-6 sm:p-8 flex flex-col sm:flex-row gap-5 sm:gap-8"
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 border border-brand-gold/20 flex items-center justify-center">
                <service.icon size={22} className="text-brand-gold" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="font-heading text-brand-white text-xl font-bold">{service.title}</h2>
                <p className="text-brand-grey text-sm font-medium">{service.summary}</p>
                <p className="text-brand-grey text-sm leading-relaxed">{service.details}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <p className="text-brand-grey text-sm">Don&apos;t see exactly what you need?</p>
          <Button
            to="/contact?type=quote"
          >
            Request a Custom Quote
            <ArrowRight size={15} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
