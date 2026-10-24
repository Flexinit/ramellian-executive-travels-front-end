// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { axe } from 'jest-axe';
import { server } from '../mocks/server';
import HomePage from './HomePage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

const car = (id, model, extra = {}) => ({
  id, model, pricePerDay: 10000, available: true, selfDrive: true, chauffeured: true, location: 'Nairobi', ...extra,
});

function renderHome() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('HomePage', () => {
  it('renders all sections in order: hero, fleet, services, how-it-works, trust, cta', () => {
    const { container } = renderHome();
    const headings = Array.from(container.querySelectorAll('h1, h2')).map((h) => h.textContent);

    expect(headings).toEqual([
      'Executive Travel, Reimagined',
      'A Vehicle for Every Occasion',
      'Services Built for Every Journey',
      'Booking in Three Simple Steps',
      'Ready for your next executive journey?',
    ]);
    expect(screen.getByLabelText(/why book with ramellian/i)).toBeInTheDocument();
  });

  it('shows real vehicles in swipeable rows, and hides a row with none', async () => {
    server.use(
      http.get(`${BASE}/vehicles`, ({ request }) => {
        const params = new URL(request.url).searchParams;
        if (params.get('chauffeured') === 'true') return HttpResponse.json([car('a', 'Prado', { selfDrive: false })]);
        if (params.get('selfDrive') === 'true') return HttpResponse.json([]);
        return HttpResponse.json([car('a', 'Prado'), car('b', 'Alphard')]);
      })
    );
    renderHome();

    const availableNow = await screen.findByRole('region', { name: 'Available now' });
    expect(await within(availableNow).findByRole('heading', { name: 'Prado' })).toBeInTheDocument();
    expect(within(availableNow).getByRole('heading', { name: 'Alphard' })).toBeInTheDocument();

    const chauffeured = await screen.findByRole('region', { name: 'Chauffeured' });
    expect(within(chauffeured).getByRole('link', { name: /see all/i })).toHaveAttribute('href', '/vehicles?chauffeured=true');
    expect(screen.queryByRole('region', { name: 'Self-Drive' })).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderHome();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
