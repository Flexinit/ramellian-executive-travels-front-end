// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriceDisplay from './PriceDisplay';

describe('PriceDisplay', () => {
  it('renders the formatted KES amount', () => {
    render(<PriceDisplay amount={12000} />);
    expect(screen.getByText(/kes 12,000/i)).toBeInTheDocument();
  });

  it('renders the period label "/ day" by default', () => {
    render(<PriceDisplay amount={8000} />);
    expect(screen.getByText(/\/ day/i)).toBeInTheDocument();
  });

  it('renders a custom period', () => {
    render(<PriceDisplay amount={45000} period="/ trip" />);
    expect(screen.getByText(/\/ trip/i)).toBeInTheDocument();
  });

  it('renders KES — for zero amount', () => {
    render(<PriceDisplay amount={0} />);
    expect(screen.getByText(/kes 0/i)).toBeInTheDocument();
  });

  it('renders KES — for undefined amount', () => {
    render(<PriceDisplay amount={undefined} />);
    expect(screen.getByText(/kes —/i)).toBeInTheDocument();
  });
});
