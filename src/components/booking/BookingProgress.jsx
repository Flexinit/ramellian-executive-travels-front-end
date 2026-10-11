import React from 'react';
import StepIndicator from '../ui/StepIndicator';
import { useAuthStore } from '../../store/authStore';

const STEPS = [
  { key: 'selection', label: 'Your Booking' },
  { key: 'contact', label: 'Your Contact', visitorsOnly: true },
  { key: 'checkout', label: 'Checkout' },
];

/**
 * Where the renter is in booking: their selection → (visitors only) how to reach them → checkout. Someone
 * who is already signed in isn't asked for a contact, so they get two steps.
 * @param {'selection'|'contact'|'checkout'} current
 */
export default function BookingProgress({ current }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const steps = STEPS.filter((s) => !(s.visitorsOnly && isAuthenticated));
  const currentStep = Math.max(0, steps.findIndex((s) => s.key === current));

  return <StepIndicator steps={steps.map(({ label }) => ({ label }))} currentStep={currentStep} />;
}
