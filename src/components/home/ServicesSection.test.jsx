// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import ServicesSection from './ServicesSection';

describe('ServicesSection', () => {
  it('renders 6 ServiceCards', () => {
    render(<ServicesSection />);
    expect(screen.getByText('Corporate Transport')).toBeInTheDocument();
    expect(screen.getByText('Airport Transfers')).toBeInTheDocument();
    expect(screen.getByText('Events & Weddings')).toBeInTheDocument();
    expect(screen.getByText('Long-Distance Routes')).toBeInTheDocument();
    expect(screen.getByText('Conferences & Business Meetings')).toBeInTheDocument();
    expect(screen.getByText('Secure Journey Management')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ServicesSection />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
