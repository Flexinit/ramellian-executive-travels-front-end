// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import HowItWorksSection from './HowItWorksSection';

describe('HowItWorksSection', () => {
  it('renders 3 StepCards', () => {
    render(<HowItWorksSection />);
    expect(screen.getByText('Choose Your Vehicle & Dates')).toBeInTheDocument();
    expect(screen.getByText('Confirm & Pay Securely')).toBeInTheDocument();
    expect(screen.getByText('Enjoy Your Executive Ride')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<HowItWorksSection />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
