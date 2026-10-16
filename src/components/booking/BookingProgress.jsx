import React from 'react';
import StepIndicator from '../ui/StepIndicator';

const STEPS = [
  { key: 'selection', label: 'Your Booking' },
  { key: 'checkout', label: 'Checkout' },
];

/**
 * Where the renter is in booking: their selection → checkout (a visitor signs up there — there's no separate
 * contact step any more).
 * @param {'selection'|'checkout'} current
 */
export default function BookingProgress({ current }) {
  const steps = STEPS;
  const currentStep = Math.max(0, steps.findIndex((s) => s.key === current));

  return <StepIndicator steps={steps.map(({ label }) => ({ label }))} currentStep={currentStep} />;
}
