// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import HeroSection from './HeroSection';

function renderHero() {
  return render(
    <MemoryRouter>
      <HeroSection />
    </MemoryRouter>
  );
}

describe('HeroSection', () => {
  it('renders the headline, sub-copy, and booking bar', () => {
    renderHero();
    expect(screen.getByRole('heading', { name: /executive travel, reimagined/i })).toBeInTheDocument();
    expect(screen.getByText(/chauffeured luxury and self-drive rentals/i)).toBeInTheDocument();
    expect(screen.getByRole('form', { name: /search vehicles/i })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderHero();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
