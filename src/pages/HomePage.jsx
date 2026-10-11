import React from 'react';
import PageTitle from '../components/layout/PageTitle';
import HeroSection from '../components/home/HeroSection';
import ServicesSection from '../components/home/ServicesSection';
import FeaturedVehiclesSection from '../components/home/FeaturedVehiclesSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import TrustSection from '../components/home/TrustSection';
import CtaBanner from '../components/home/CtaBanner';

/**
 * Public homepage — otto.rentals-style search-first layout on Ramellian's
 * dark/gold theme. See docs/design.md §4 for the section order.
 */
export default function HomePage() {
  return (
    <>
      <PageTitle />
      <HeroSection />
      <ServicesSection />
      <FeaturedVehiclesSection />
      <HowItWorksSection />
      <TrustSection />
      <CtaBanner />
    </>
  );
}
