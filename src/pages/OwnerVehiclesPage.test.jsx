// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import OwnerVehiclesPage from './OwnerVehiclesPage';

const BASE = 'http://192.168.8.11:8080/api/v1';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <OwnerVehiclesPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const MINE = {
  id: 'v1',
  model: 'Toyota Prado',
  registrationNumber: 'KDA 123A',
  location: 'Nairobi',
  pricePerDay: 15000,
  capacity: 7,
  fuelType: 'DIESEL',
  transmissionType: 'AUTOMATIC',
  selfDrive: true,
  chauffeured: false,
  available: true,
  ownerEmail: 'owner@example.com',
};
const THEIRS = { ...MINE, id: 'v2', model: 'Toyota Noah', ownerEmail: 'someone-else@example.com' };

beforeEach(() => {
  act(() => useAuthStore.setState({ token: 'test-token', user: { id: '1', email: 'owner@example.com', roles: ['OWNER'] } }));
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
});

describe('OwnerVehiclesPage', () => {
  it("lists the vehicles the backend returns for the signed-in owner (GET /vehicles/me)", async () => {
    server.use(http.get(`${BASE}/vehicles/me`, () => HttpResponse.json([MINE])));
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Toyota Prado' })).toBeInTheDocument();
    expect(screen.getByText('KDA 123A')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Self-Drive')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Toyota Noah' })).not.toBeInTheDocument();
  });

  it('shows a vehicle that is not available yet, so an owner sees all their vehicles regardless of availability', async () => {
    server.use(
      http.get(`${BASE}/vehicles/me`, () => HttpResponse.json([{ ...MINE, id: 'v5', model: 'Unlisted Noah', available: false }])),
      http.get(`${BASE}/bookings/owner`, () => HttpResponse.json([{ id: 'b1', vehicleId: 'v5', status: 'CONFIRMED', startTime: '2030-10-05T09:00:00+03:00', endTime: '2030-10-08T09:00:00+03:00' }])),
      http.get(`${BASE}/vehicles/v5`, () => HttpResponse.json({ ...MINE, id: 'v5', model: 'Unlisted Noah', available: false }))
    );
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Unlisted Noah' })).toBeInTheDocument();
    expect(screen.getByText('Not listed yet')).toBeInTheDocument();
    // …with a calendar showing the dates it is booked.
    expect(screen.getByText('1 upcoming booking')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view calendar/i })).toBeInTheDocument();
  });

  it('lets the owner pull a vehicle from renters in one click (PUT /vehicles/{id})', async () => {
    let body;
    server.use(
      http.get(`${BASE}/vehicles/me`, () => HttpResponse.json([MINE])),
      http.put(`${BASE}/vehicles/v1`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...MINE, available: body.available });
      })
    );
    renderPage();

    await userEvent.setup().click(await screen.findByRole('switch', { name: /available for booking/i }));

    await waitFor(() => expect(body).toMatchObject({ model: 'Toyota Prado', registrationNumber: 'KDA 123A', available: false }));
  });

  it('links to the add-vehicle form', async () => {
    server.use(http.get(`${BASE}/vehicles/me`, () => HttpResponse.json([MINE])));
    renderPage();

    expect(await screen.findByRole('link', { name: /add vehicle/i })).toHaveAttribute('href', '/owner/vehicles/new');
  });

  it('shows an empty state when the owner has no vehicles', async () => {
    server.use(http.get(`${BASE}/vehicles/me`, () => HttpResponse.json([])));
    renderPage();

    expect(await screen.findByRole('heading', { name: /no vehicles yet/i })).toBeInTheDocument();
  });

  it('shows a retryable error banner when the fetch fails', async () => {
    server.use(http.get(`${BASE}/vehicles/me`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load your vehicles/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    server.use(http.get(`${BASE}/vehicles/me`, () => HttpResponse.json([MINE])));
    const { container } = renderPage();
    await screen.findByRole('heading', { name: 'Toyota Prado' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
