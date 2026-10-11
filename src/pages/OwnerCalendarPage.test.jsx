// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import OwnerCalendarPage from './OwnerCalendarPage';

const BASE = 'http://192.168.8.11:8080/api/v1';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <OwnerCalendarPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const VEHICLE = (over) => ({ id: 'v1', model: 'Toyota Prado', pricePerDay: 15000, available: true, ...over });

beforeEach(() => {
  act(() => useAuthStore.setState({ token: 'test-token', user: { id: '1', email: 'owner@example.com', roles: ['OWNER'] } }));
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
});

describe('OwnerCalendarPage', () => {
  it('shows an empty state when the owner has no vehicles', async () => {
    server.use(http.get(`${BASE}/vehicles/me`, () => HttpResponse.json([])));
    renderPage();
    expect(await screen.findByText(/no vehicles yet/i)).toBeInTheDocument();
  });

  it('shows no vehicle filter with a single vehicle, and the calendar reflects its bookings', async () => {
    server.use(
      http.get(`${BASE}/vehicles/me`, () => HttpResponse.json([VEHICLE()])),
      http.get(`${BASE}/bookings/owner`, () =>
        HttpResponse.json([{ id: 'b1', vehicleId: 'v1', status: 'CONFIRMED', startTime: '2030-10-05T09:00:00+03:00', endTime: '2030-10-07T09:00:00+03:00' }])
      )
    );
    renderPage();

    await screen.findByText('Confirmed'); // the legend, once the calendar has periods to show
    expect(screen.queryByLabelText('Vehicle')).not.toBeInTheDocument();
  });

  it('offers a vehicle filter with more than one vehicle, narrowing the calendar to just that one', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${BASE}/vehicles/me`, () => HttpResponse.json([VEHICLE(), VEHICLE({ id: 'v2', model: 'Rolls-Royce Ghost' })])),
      http.get(`${BASE}/bookings/owner`, () =>
        HttpResponse.json([
          { id: 'b1', vehicleId: 'v1', status: 'CONFIRMED', startTime: '2030-10-05T09:00:00+03:00', endTime: '2030-10-05T18:00:00+03:00' },
          { id: 'b2', vehicleId: 'v2', status: 'PENDING', startTime: '2030-10-20T09:00:00+03:00', endTime: '2030-10-20T18:00:00+03:00' },
        ])
      )
    );
    renderPage();

    const select = await screen.findByLabelText('Vehicle');
    expect(await screen.findByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();

    await user.selectOptions(select, 'v1');
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
  });

  it('shows a retryable error banner when either fetch fails', async () => {
    server.use(http.get(`${BASE}/vehicles/me`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })));
    renderPage();
    expect(await screen.findByText(/could not load your fleet's bookings/i)).toBeInTheDocument();
  });
});
