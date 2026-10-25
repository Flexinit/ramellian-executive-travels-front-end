// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import VehiclesPage from './VehiclesPage';
import { useBookingStore } from '../store/bookingStore';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

// A vehicle exactly as the live backend returned it (VehicleResponse).
const LIVE_MERCEDES = {
  id: 'f4f8f3e7-250c-4ef4-8123-f27195782f82',
  model: 'Mercedes Benz',
  vin: 'VINN',
  registrationNumber: 'KDC',
  location: 'Roysambu division',
  pricePerDay: 15000.0,
  rating: null,
  available: true,
  capacity: 8,
  color: 'Pearl White',
  fuelType: 'DIESEL',
  transmissionType: 'AUTOMATIC',
  selfDrive: true,
  chauffeured: true,
  tripTypes: ['CAKE_TRANSPORTATION', 'GENERAL'],
  ownerEmail: 'felixwanzetse@gmail.com',
  hasWorkingAC: false,
  comprehensiveInsurance: false,
  insuranceVerificationStickerPhoto: null,
  availableFrom: null,
  availableTo: null,
};

function renderPage(route = '/vehicles') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <VehiclesPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('VehiclesPage (the main search page)', () => {
  it('lists an available vehicle just as the backend returns it, with its price', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json([LIVE_MERCEDES])));
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Mercedes Benz' })).toBeInTheDocument();
    expect(screen.getByText(/1 vehicle found/i)).toBeInTheDocument();
    expect(screen.getAllByText('Roysambu division').length).toBeGreaterThan(0);
  });

  it('still lists it when the search page adds its default sort', async () => {
    let query;
    server.use(
      http.get(`${BASE}/vehicles`, ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json([LIVE_MERCEDES]);
      })
    );
    renderPage('/vehicles?sort=recommended');

    expect(await screen.findByRole('heading', { name: 'Mercedes Benz' })).toBeInTheDocument();
    expect(query).toContain('sort=recommended');
  });

  it('clears every filter it arrives with, keeping only the price range and the sort', async () => {
    let query;
    server.use(
      http.get(`${BASE}/vehicles`, ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json([LIVE_MERCEDES]);
      })
    );
    renderPage('/vehicles?sort=recommended&selfDrive=true&location=Mombasa&minPrice=9000&maxPrice=20000');

    await screen.findByRole('heading', { name: 'Mercedes Benz' });
    await waitFor(() => expect(query).not.toContain('selfDrive'));
    expect(query).not.toContain('location');
    expect(query).toContain('minPrice=9000');
    expect(query).toContain('maxPrice=20000');
    expect(query).toContain('sort=recommended');
  });

  it('keeps what was just searched for on the home page, and remembers it for the vehicle opened next', async () => {
    let query;
    server.use(
      http.get(`${BASE}/vehicles`, ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json([LIVE_MERCEDES]);
      })
    );
    const start = '2099-10-01T09:00:00.000Z';
    renderPage({
      pathname: '/vehicles',
      search: `?location=Mombasa&returnLocation=Diani&startTime=${start}&endTime=2099-10-03T09:00:00.000Z&chauffeured=true`,
      state: { fromSearch: true },
    });

    await screen.findByRole('heading', { name: 'Mercedes Benz' });
    expect(query).toContain('location=Mombasa');
    expect(useBookingStore.getState().search).toMatchObject({
      startTime: start, bookingMode: 'CHAUFFEURED', pickupLocation: 'Mombasa', dropoffLocation: 'Diani',
    });
  });

  it('sorts by Newest in the portal, never sending that sort to the backend (which refuses it)', async () => {
    const queries = [];
    server.use(
      http.get(`${BASE}/vehicles`, ({ request }) => {
        queries.push(new URL(request.url).search);
        return HttpResponse.json([
          { ...LIVE_MERCEDES, id: 'old', model: 'Older Car', reviewedAt: '2026-09-25T10:00:00Z' },
          { ...LIVE_MERCEDES, id: 'new', model: 'Newer Car', reviewedAt: '2026-10-06T10:00:00Z' },
        ]);
      })
    );
    renderPage('/vehicles?sort=newest');

    await screen.findByRole('heading', { name: 'Newer Car' });
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names.indexOf('Newer Car')).toBeLessThan(names.indexOf('Older Car'));
    expect(queries.some((q) => q.includes('sort=newest'))).toBe(false);
  });

  it('pins the full-width search bar, and on a wide screen the filter column beside the results', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json([LIVE_MERCEDES])));
    renderPage();

    expect(screen.getByRole('search', { name: /search vehicles/i }).className).toContain('sticky');
    expect(screen.getByRole('complementary', { name: /filters/i }).className).toContain('sticky');
    expect(screen.queryByRole('button', { name: /^filters/i })).not.toBeInTheDocument();
  });

  it('on a narrower screen, opens the filters from a Filters button inside the pinned search bar', async () => {
    const original = window.matchMedia;
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    try {
      const user = userEvent.setup();
      server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json([LIVE_MERCEDES])));
      renderPage('/vehicles?sort=recommended');

      const bar = screen.getByRole('search', { name: /search vehicles/i });
      const toggle = within(bar).getByRole('button', { name: /^filters/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(within(bar).getByText(/available in/i)).toBeInTheDocument();
      expect(screen.queryByRole('complementary', { name: /filters/i })).not.toBeInTheDocument();
    } finally {
      window.matchMedia = original;
    }
  });

  it('shows "Booked" only once dates are chosen — without them it would read as unavailable', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json([{ ...LIVE_MERCEDES, booked: true }])));
    const { unmount } = renderPage();
    await screen.findByRole('heading', { name: 'Mercedes Benz' });
    expect(screen.queryByText('Booked')).not.toBeInTheDocument();
    unmount();

    renderPage({
      pathname: '/vehicles',
      search: '?startTime=2099-10-01T09:00:00.000Z&endTime=2099-10-03T09:00:00.000Z',
      state: { fromSearch: true },
    });
    await screen.findByRole('heading', { name: 'Mercedes Benz' });
    expect(screen.getByText('Booked')).toBeInTheDocument();
  });

  it('hides a vehicle the backend marks unavailable, so nobody books a car that is off', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json([{ ...LIVE_MERCEDES, available: false }])));
    renderPage();

    expect(await screen.findByText(/no vehicles available/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mercedes Benz' })).not.toBeInTheDocument();
  });

  it('says to log in — not "check your connection" — when the backend refuses a signed-out visitor', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => new HttpResponse(null, { status: 403 })));
    renderPage();

    expect(await screen.findByText(/please log in to browse vehicles/i)).toBeInTheDocument();
    expect(screen.queryByText(/check your connection/i)).not.toBeInTheDocument();
  });
});

// ─── by location, and the price slider ──────────────────────────────────────

const CARS = [
  { ...LIVE_MERCEDES, id: 'a', model: 'Mercedes Benz', location: 'Roysambu division', pricePerDay: 15000 },
  { ...LIVE_MERCEDES, id: 'b', model: 'Toyota Prado', location: 'Nairobi CBD', pricePerDay: 22000 },
  { ...LIVE_MERCEDES, id: 'c', model: 'Toyota Noah', location: 'nairobi  cbd', pricePerDay: 8000 },
  { ...LIVE_MERCEDES, id: 'd', model: 'Subaru Forester', location: 'Mombasa', pricePerDay: 12000 },
];

function ShowUrl() {
  const { search } = useLocation();
  return <p data-testid="url">{search}</p>;
}

function renderWithUrl(route = '/vehicles') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <VehiclesPage />
          <ShowUrl />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('VehiclesPage — vehicles available by location', () => {
  it('lists the places vehicles are available with how many are in each, busiest first', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json(CARS)));
    renderWithUrl();

    const group = await screen.findByRole('group', { name: 'Available in' });
    const chips = within(group).getAllByRole('button').map((b) => b.textContent.replace(/\s+/g, ' ').trim());
    expect(chips).toEqual(['Nairobi CBD (2)', 'Mombasa (1)', 'Roysambu division (1)']);
  });

  it('shows one grid across every place — no section per place — with the place shown on each card', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json(CARS)));
    renderWithUrl();

    await screen.findByRole('heading', { name: 'Toyota Prado' });
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(CARS.length);
    expect(screen.getAllByText(/nairobi cbd/i).length).toBeGreaterThan(0);
  });

  it('follows a chosen sort exactly', async () => {
    // The backend sorts price_desc; here it already sends them dearest first, across three places.
    const byPrice = [...CARS].sort((a, b) => b.pricePerDay - a.pricePerDay);
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json(byPrice)));
    renderWithUrl('/vehicles?sort=price_desc');

    await screen.findByRole('heading', { name: 'Toyota Prado' });
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Toyota Prado', 'Mercedes Benz', 'Subaru Forester', 'Toyota Noah',
    ]);
  });

  it('picking a place filters to it, and picking it again clears the filter', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json(CARS)));
    renderWithUrl();

    // Look the chip up afresh each time: the panel re-renders as the vehicles load.
    const chip = async () => within(await screen.findByRole('group', { name: 'Available in' })).findByRole('button', { name: /mombasa/i });

    await user.click(await chip());
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('location=Mombasa'), { timeout: 4000 });
    await waitFor(async () => expect(await chip()).toHaveAttribute('aria-pressed', 'true'));

    await user.click(await chip());
    await waitFor(() => expect(screen.getByTestId('url')).not.toHaveTextContent('location='), { timeout: 4000 });
  });

  it('does not lose the other places from the list once one is picked', async () => {
    server.use(
      http.get(`${BASE}/vehicles`, ({ request }) => {
        const loc = new URL(request.url).searchParams.get('location');
        return HttpResponse.json(loc ? CARS.filter((c) => c.location.toLowerCase() === loc.toLowerCase()) : CARS);
      })
    );
    renderWithUrl('/vehicles?location=Mombasa');

    await screen.findByRole('heading', { name: 'Subaru Forester' });
    const group = screen.getByRole('group', { name: 'Available in' });
    expect(within(group).getAllByRole('button')).toHaveLength(3);
  });
});

describe('VehiclesPage — price slider', () => {
  const sliders = async () => ({
    min: await screen.findByRole('slider', { name: /minimum price per day/i }),
    max: await screen.findByRole('slider', { name: /maximum price per day/i }),
  });

  it('replaces the two price boxes with a slider spanning the cheapest to the dearest vehicle', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json(CARS)));
    renderWithUrl();

    const { min, max } = await sliders();
    expect(screen.queryByLabelText(/min price/i)).not.toBeInTheDocument();
    // The range is worked out from the vehicles once they arrive: dearest is 22,000, rounded up.
    await waitFor(() => expect(max).toHaveAttribute('max', '25000'));
    expect(min).toHaveAttribute('min', '0');
    await waitFor(() => expect(max).toHaveValue('25000'));
    expect(min).toHaveValue('0');
  });

  it('puts the chosen range in the URL when a handle is let go — and only then', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json(CARS)));
    renderWithUrl();
    const { min, max } = await sliders();

    fireEvent.change(min, { target: { value: '9000' } });
    fireEvent.change(max, { target: { value: '20000' } });
    expect(screen.getByTestId('url')).not.toHaveTextContent('Price'); // still dragging: nothing sent yet
    expect(screen.getByTestId('url')).toHaveTextContent('');

    fireEvent.pointerUp(max);
    await waitFor(() => expect(screen.getByTestId('url')).toHaveTextContent('minPrice=9000'));
    expect(screen.getByTestId('url')).toHaveTextContent('maxPrice=20000');
  });

  it('drops a limit left at the end of the slider instead of pinning it', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json(CARS)));
    renderWithUrl('/vehicles?minPrice=9000&maxPrice=20000');
    const { min, max } = await sliders();
    expect(min).toHaveValue('9000');
    expect(max).toHaveValue('20000');

    fireEvent.change(min, { target: { value: '0' } });
    fireEvent.change(max, { target: { value: '25000' } });
    fireEvent.pointerUp(max);
    expect(screen.getByTestId('url')).not.toHaveTextContent('Price');
  });

  it('keeps the handles from crossing', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json(CARS)));
    renderWithUrl('/vehicles?minPrice=10000&maxPrice=12000');
    const { min } = await sliders();
    fireEvent.change(min, { target: { value: '20000' } });
    expect(Number(min.value)).toBeLessThan(12000);
  });

  it('shows the range in shillings and asks the backend with it', async () => {
    let query;
    server.use(
      http.get(`${BASE}/vehicles`, ({ request }) => {
        query = new URL(request.url).searchParams;
        return HttpResponse.json(CARS);
      })
    );
    renderWithUrl('/vehicles?minPrice=9000&maxPrice=20000');
    await sliders();
    expect(screen.getByText(/KES 9,000\s+–\s+KES 20,000/)).toBeInTheDocument();
    await screen.findAllByRole('heading', { level: 3 });
    expect([...query.keys()]).toContain('minPrice');
  });
});


describe('VehiclesPage — searched from the home page with a pick-up place', () => {
  it('shows the cars based near the place, without sending it to the backend as a strict filter', async () => {
    let query;
    server.use(
      http.get(`${BASE}/vehicles`, ({ request }) => {
        query = new URL(request.url).search;
        return HttpResponse.json(CARS);
      })
    );
    renderWithUrl({ pathname: '/vehicles', search: '?near=Mombasa%20Road%2C%20Kenya', state: { fromSearch: true } });
    expect(await screen.findByRole('heading', { name: 'Subaru Forester' })).toBeInTheDocument();
    expect(query).not.toContain('near');
    expect(query).not.toContain('location');
    expect(screen.queryByRole('heading', { name: 'Toyota Prado' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/cars based near mombasa road, kenya/i);
  });

  it('shows every car, with a note, when none is based near the place — never an empty page', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json(CARS)));
    renderWithUrl({ pathname: '/vehicles', search: '?near=JKIA%20Terminal%201', state: { fromSearch: true } });
    expect(await screen.findByRole('heading', { name: 'Subaru Forester' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(CARS.length);
    expect(screen.getByRole('status')).toHaveTextContent(/no cars are based near jkia terminal 1 yet/i);
  });
});
