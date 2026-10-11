// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { axe } from 'jest-axe';
import ServicesPage from './ServicesPage';

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <ServicesPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('ServicesPage', () => {
  it('renders an anchored section for each of the 6 service types', () => {
    const { container } = renderPage();
    const ids = ['corporate', 'airport', 'weddings', 'long-distance', 'conferences', 'secure'];
    ids.forEach((id) => {
      expect(container.querySelector(`#${id}`)).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: 'Corporate Transport' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Secure Journey Management' })).toBeInTheDocument();
  });

  it('links to a custom quote request', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /request a custom quote/i })).toHaveAttribute(
      'href',
      '/contact?type=quote'
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPage();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
