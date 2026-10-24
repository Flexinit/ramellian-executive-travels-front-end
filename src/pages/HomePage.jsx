import React from 'react';
import PageTitle from '../components/layout/PageTitle';
import HeroSection from '../components/home/HeroSection';
import ServicesSection from '../components/home/ServicesSection';
import FeaturedVehiclesSection from '../components/home/FeaturedVehiclesSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import TrustSection from '../components/home/TrustSection';
import CtaBanner from '../components/home/CtaBanner';

/**
 * Public homepage — search first, then the cars (the design system's Home: search, then "Best Cars"), then the
 * services, how it works, why book with us and the closing banner. See docs/design.md §4 for the section order.
 */
export default function HomePage() {
  return (
    <>
      <PageTitle />
      <HeroSection />
      <FeaturedVehiclesSection />
      <ServicesSection />
      <HowItWorksSection />
      <TrustSection />
      <CtaBanner />
    </>
  );
}
