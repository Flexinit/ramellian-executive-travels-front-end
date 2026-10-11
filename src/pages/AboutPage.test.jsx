// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { axe } from 'jest-axe';
import AboutPage from './AboutPage';

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('AboutPage', () => {
  it('renders the company story and values', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /our story/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what we value/i })).toBeInTheDocument();
    expect(screen.getByText('Reliability')).toBeInTheDocument();
    expect(screen.getByText('Trust')).toBeInTheDocument();
    expect(screen.getByText('Excellence')).toBeInTheDocument();
  });

  it('links to the fleet browse page', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /browse our fleet/i })).toHaveAttribute('href', '/vehicles');
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPage();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
