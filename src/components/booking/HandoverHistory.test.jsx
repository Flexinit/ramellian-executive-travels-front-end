// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { useAuthStore } from '../../store/authStore';
import HandoverHistory from './HandoverHistory';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderHistory() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <HandoverHistory bookingId="b1" />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  act(() => useAuthStore.setState({ token: 't', user: { id: 'u', email: 'r@example.com', roles: ['RENTER'] } }));
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
});

describe('HandoverHistory — the odometer photo', () => {
  it('shows the photo taken at the handover, fetched from GET /handovers/{id}/odometer-photo', async () => {
    server.use(
      http.get(`${BASE}/handovers/bookings/:bookingId`, () =>
        HttpResponse.json([{ id: 'h1', type: 'PICKUP', odometerReading: 100000, fuelLevel: 'FULL', odometerPhotoFileName: 'h1.jpg' }])
      )
    );
    renderHistory();
    expect(await screen.findByRole('img', { name: /^odometer at pickup$/i })).toBeInTheDocument();
  });

  it('shows no photo for a handover recorded without one', async () => {
    server.use(
      http.get(`${BASE}/handovers/bookings/:bookingId`, () =>
        HttpResponse.json([{ id: 'h1', type: 'PICKUP', odometerReading: 100000, fuelLevel: 'FULL' }])
      )
    );
    renderHistory();
    expect(await screen.findByText('Pickup')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /odometer/i })).not.toBeInTheDocument();
  });
});
