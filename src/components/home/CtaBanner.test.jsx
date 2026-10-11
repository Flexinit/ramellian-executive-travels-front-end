// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import CtaBanner from './CtaBanner';

function renderBanner() {
  return render(
    <MemoryRouter>
      <CtaBanner />
    </MemoryRouter>
  );
}

describe('CtaBanner', () => {
  it('renders the heading and a link to search vehicles', () => {
    renderBanner();
    expect(screen.getByRole('heading', { name: /ready for your next executive journey/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /search vehicles/i })).toHaveAttribute('href', '/vehicles');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderBanner();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
