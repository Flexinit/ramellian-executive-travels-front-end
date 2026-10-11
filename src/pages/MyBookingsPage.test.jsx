// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import MyBookingsPage from './MyBookingsPage';

const BASE = 'http://192.168.8.11:8080/api/v1';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dashboard/bookings']}>
          <MyBookingsPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const BOOKINGS = [
  { id: 'older-confirmed', vehicleId: 'v1', vehicleModel: 'Prado', status: 'CONFIRMED', startTime: '2026-10-01T09:00:00Z', endTime: '2026-10-02T09:00:00Z' },
  { id: 'newer-confirmed', vehicleId: 'v2', vehicleModel: 'Alphard', status: 'CONFIRMED', startTime: '2026-10-05T09:00:00Z', endTime: '2026-10-06T09:00:00Z' },
  { id: 'a-pending-one', vehicleId: 'v3', vehicleModel: 'Noah', status: 'PENDING', startTime: '2026-10-03T09:00:00Z', endTime: '2026-10-04T09:00:00Z' },
];

const MODEL_BY_VEHICLE_ID = { v1: 'Prado', v2: 'Alphard', v3: 'Noah' };

function serveDistinctVehicles() {
  // The row now fetches each vehicle for real (not just on expand) and prefers that fresh model name
  // over the booking's own possibly-stale `vehicleModel` snapshot — so, unlike the shared default mock
  // (which answers every id with the same fixed vehicle), each id here must resolve to the model its own
  // booking fixture expects to see.
  server.use(http.get(`${BASE}/vehicles/:id`, ({ params }) => HttpResponse.json({ id: params.id, model: MODEL_BY_VEHICLE_ID[params.id], photos: [] })));
}

function tableRowLabels() {
  return screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent);
}

describe('MyBookingsPage', () => {
  it('defaults to the Confirmed tab on arrival, latest trip first', async () => {
    server.use(http.get(`${BASE}/bookings/mine`, () => HttpResponse.json(BOOKINGS)));
    serveDistinctVehicles();
    renderPage();

    const confirmedTab = await screen.findByRole('tab', { name: /^confirmed/i });
    expect(confirmedTab).toHaveAttribute('aria-selected', 'true');
    await screen.findByText('Alphard'); // waits for the real bookings to have loaded before checking counts
    expect(confirmedTab).toHaveTextContent('(2)'); // the two CONFIRMED bookings, not the one PENDING
    expect(screen.getByRole('tab', { name: /pending payment/i })).toHaveTextContent('(1)');
    expect(screen.queryByText('Noah')).not.toBeInTheDocument(); // PENDING, filtered out by the default tab

    const labels = tableRowLabels();
    expect(labels[0]).toContain('Alphard'); // 2026-10-05, later than Prado's 2026-10-01
    expect(labels[1]).toContain('Prado');
  });

  it('switches to another status by clicking its tab', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/bookings/mine`, () => HttpResponse.json(BOOKINGS)));
    serveDistinctVehicles();
    renderPage();

    await screen.findByText('Alphard');
    await user.click(screen.getByRole('tab', { name: /pending payment/i }));

    expect(await screen.findByText('Noah')).toBeInTheDocument();
    expect(screen.queryByText('Alphard')).not.toBeInTheDocument();
  });
});
