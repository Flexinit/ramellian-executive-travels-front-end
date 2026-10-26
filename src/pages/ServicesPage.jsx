import React from 'react';
import { Building2, Plane, PartyPopper, Route, Users, ShieldCheck, ArrowRight } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { SERVICES as SERVICE_TEXT } from '../content/siteContent';

/**
 * Anchor ids must match the Navbar/Footer Services dropdown links
 * (docs/menu-structure.md §3.2, §7): #corporate, #airport, #weddings,
 * #long-distance, #conferences, #secure.
 */
// The words live in src/content/siteContent.js (the build writes them into this page's HTML); the icons are added here.
const ICONS = { corporate: Building2, airport: Plane, weddings: PartyPopper, 'long-distance': Route, conferences: Users, secure: ShieldCheck };
const SERVICES = SERVICE_TEXT.map((s) => ({ ...s, icon: ICONS[s.id] }));

/** Detailed service descriptions, anchored for the Navbar/Footer dropdown links (docs/requirements.md PUB-02). */
export default function ServicesPage() {
  return (
    <PageWrapper>
      <PageTitle title="Our Services" />
      <div className="flex flex-col gap-10">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-brand-gold-deep text-xs font-semibold tracking-widest uppercase">What We Offer</span>
          <h1 className="font-heading text-ink text-3xl sm:text-4xl font-bold">Our Services</h1>
          <p className="text-muted text-sm max-w-xl">
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
              <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
                <service.icon size={22} className="text-accent" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="font-heading text-ink text-xl font-bold">{service.title}</h2>
                <p className="text-muted text-sm font-medium">{service.summary}</p>
                <p className="text-muted text-sm leading-relaxed">{service.details}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex flex-col items-center text-center gap-3 pt-2">
          <p className="text-muted text-sm">Don&apos;t see exactly what you need?</p>
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
