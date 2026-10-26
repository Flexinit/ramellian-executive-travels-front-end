// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { useAuthStore } from '../../store/authStore';
import PickupReminder from './PickupReminder';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;
const hoursFromNow = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

function renderAt(route = '/vehicles') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[route]}>
        <PickupReminder />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function withBookings(bookings) {
  server.use(
    http.get(`${BASE}/bookings/mine`, () => HttpResponse.json(bookings)),
    http.get(`${BASE}/vehicles/v1`, () => HttpResponse.json({ id: 'v1', model: 'Porche Cayenne', pricePerDay: 1 }))
  );
}

beforeEach(() => {
  act(() => useAuthStore.setState({ token: 't', user: { id: 'u1', email: 'r@x.com', roles: ['RENTER'] } }));
});
afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
});

describe('PickupReminder', () => {
  it('on the day: pick up the car, then record the pickup — the button opens the pickup form', async () => {
    withBookings([{ id: 'b1', vehicleId: 'v1', status: 'CONFIRMED', startTime: hoursFromNow(-1), pickupLocation: 'JKIA' }]);
    renderAt();

    expect(await screen.findByText(/time to pick up the porche cayenne at jkia/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Record pickup' })).toHaveAttribute('href', '/dashboard/bookings/b1?record=pickup');
  });

  it('the day before: a heads-up that the pickup is tomorrow', async () => {
    const tomorrowNoon = new Date();
    tomorrowNoon.setDate(tomorrowNoon.getDate() + 1);
    tomorrowNoon.setHours(12, 0, 0, 0);
    withBookings([{ id: 'b1', vehicleId: 'v1', status: 'CONFIRMED', startTime: tomorrowNoon.toISOString() }]);
    renderAt();

    expect(await screen.findByText(/you pick up the porche cayenne tomorrow/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View booking' })).toHaveAttribute('href', '/dashboard/bookings/b1');
  });

  it('nothing once the pickup is recorded (Active), or for a trip days away', async () => {
    withBookings([
      { id: 'b1', vehicleId: 'v1', status: 'ACTIVE', startTime: hoursFromNow(-5) },
      { id: 'b2', vehicleId: 'v1', status: 'CONFIRMED', startTime: hoursFromNow(24 * 5) },
    ]);
    renderAt();
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('status', { name: 'Your pickup' })).not.toBeInTheDocument();
  });

  it("isn't repeated on that booking's own page, which has the button already", async () => {
    withBookings([{ id: 'b1', vehicleId: 'v1', status: 'CONFIRMED', startTime: hoursFromNow(-1) }]);
    renderAt('/dashboard/bookings/b1');
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('status', { name: 'Your pickup' })).not.toBeInTheDocument();
  });
});
