// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import HandoversPage from './HandoversPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

const BOOKINGS = [
  { id: 'b-done', status: 'COMPLETED', vehicleModel: 'Mercedes AMG', renterName: 'Ann', startTime: '2026-10-01T09:00:00Z', endTime: '2026-10-03T09:00:00Z' },
  { id: 'b-out', status: 'ACTIVE', vehicleModel: 'VW Touran', renterName: 'Ann', startTime: '2026-11-10T09:00:00Z', endTime: '2026-11-12T09:00:00Z' },
  { id: 'b-pending', status: 'PENDING', vehicleModel: 'Porsche', startTime: '2026-12-01T09:00:00Z', endTime: '2026-12-02T09:00:00Z' },
];

const HANDOVERS = {
  'b-done': [
    { id: 'h1', type: 'PICKUP', odometerReading: 100000, fuelLevel: 'FULL', odometerPhotoFileName: 'h1.jpg', signedBy: 'Dispatcher' },
    { id: 'h2', type: 'DROPOFF', odometerReading: 100450, fuelLevel: 'HALF' },
  ],
  'b-out': [{ id: 'h3', type: 'PICKUP', odometerReading: 5000, fuelLevel: 'FULL' }],
};

function renderPage(side) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <HandoversPage side={side} />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  act(() => useAuthStore.setState({ token: 't', user: { id: 'u', email: 'u@example.com', roles: ['RENTER', 'OWNER'] } }));
  server.use(
    http.get(`${BASE}/bookings/mine`, () => HttpResponse.json(BOOKINGS)),
    http.get(`${BASE}/bookings/owner`, () => HttpResponse.json(BOOKINGS)),
    http.get(`${BASE}/handovers/bookings/:bookingId`, ({ params }) => HttpResponse.json(HANDOVERS[params.bookingId] || []))
  );
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
});

describe('HandoversPage', () => {
  it('lists the renter’s collected bookings, newest first, with pickup, return, the odometer photo and km driven', async () => {
    renderPage('renter');
    const list = await screen.findByRole('list', { name: 'Handovers' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2); // the Pending one has no handover yet
    expect(within(items[0]).getByText('VW Touran')).toBeInTheDocument();

    const done = items[1];
    expect(await within(done).findByText('Pickup')).toBeInTheDocument();
    expect(within(done).getByText('Return')).toBeInTheDocument();
    expect(await within(done).findByRole('img', { name: /^odometer at pickup$/i })).toBeInTheDocument();
    expect(within(done).getByText(/driven: 450 km/i)).toBeInTheDocument();
    expect(within(done).getByRole('link', { name: /view booking/i })).toHaveAttribute('href', '/dashboard/bookings/b-done');
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Showing 1–2 of 2');
  });

  it('gives the owner the same list, linking to their own booking pages', async () => {
    renderPage('owner');
    const list = await screen.findByRole('list', { name: 'Handovers' });
    const links = await within(list).findAllByRole('link', { name: /view booking/i });
    expect(links[0]).toHaveAttribute('href', '/owner/bookings/b-out');
  });

  it('leaves out a collected booking with no pickup or return recorded', async () => {
    server.use(
      http.get(`${BASE}/bookings/mine`, () =>
        HttpResponse.json([...BOOKINGS, { id: 'b-none', status: 'COMPLETED', vehicleModel: 'Old Car', startTime: '2026-09-01T09:00:00Z', endTime: '2026-09-02T09:00:00Z' }])
      )
    );
    renderPage('renter');
    const list = await screen.findByRole('list', { name: 'Handovers' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText('Old Car')).not.toBeInTheDocument();
  });

  it('says so when nothing has been handed over yet', async () => {
    server.use(http.get(`${BASE}/bookings/mine`, () => HttpResponse.json([BOOKINGS[2]])));
    renderPage('renter');
    expect(await screen.findByText(/no handovers yet/i)).toBeInTheDocument();
  });
});
