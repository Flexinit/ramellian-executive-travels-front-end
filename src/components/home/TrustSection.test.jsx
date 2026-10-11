// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import TrustSection from './TrustSection';

describe('TrustSection', () => {
  it('renders 4 TrustBadges', () => {
    render(<TrustSection />);
    expect(screen.getByText('Vetted Chauffeurs')).toBeInTheDocument();
    expect(screen.getByText('Secure Payments')).toBeInTheDocument();
    expect(screen.getByText('24/7 Support')).toBeInTheDocument();
    expect(screen.getByText('Fully Insured Fleet')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<TrustSection />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
