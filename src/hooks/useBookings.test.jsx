// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import { useRenterVehicleOverlap } from './useBookings';

const BASE = 'http://192.168.8.11:8080/api/v1';

function wrapper({ children }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const MY_BOOKING = {
  id: 'bk-1',
  vehicleId: 'v1',
  status: 'CONFIRMED',
  startTime: '2026-10-05T09:00:00+03:00',
  endTime: '2026-10-07T09:00:00+03:00',
};

describe('useRenterVehicleOverlap', () => {
  beforeEach(() => {
    act(() => useAuthStore.setState({ token: 't', user: { id: 'me', email: 'r@example.com', roles: ['RENTER'] } }));
  });

  it("flags an overlap with the renter's own existing booking on the same vehicle", async () => {
    server.use(http.get(`${BASE}/bookings/mine`, () => HttpResponse.json([MY_BOOKING])));
    const { result } = renderHook(
      () => useRenterVehicleOverlap('v1', '2026-10-06T09:00:00+03:00', '2026-10-08T09:00:00+03:00'),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isBooked).toBe(true));
    expect(result.current.booking.id).toBe('bk-1');
  });

  it('does not flag non-overlapping dates on the same vehicle', async () => {
    server.use(http.get(`${BASE}/bookings/mine`, () => HttpResponse.json([MY_BOOKING])));
    const { result } = renderHook(
      () => useRenterVehicleOverlap('v1', '2026-11-01T09:00:00+03:00', '2026-11-03T09:00:00+03:00'),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isBooked).toBe(false));
  });

  it('does not flag a different vehicle', async () => {
    server.use(http.get(`${BASE}/bookings/mine`, () => HttpResponse.json([MY_BOOKING])));
    const { result } = renderHook(
      () => useRenterVehicleOverlap('v2', '2026-10-06T09:00:00+03:00', '2026-10-08T09:00:00+03:00'),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isBooked).toBe(false);
  });

  it('stays disabled (no request, no false positive) for a signed-out visitor', () => {
    act(() => useAuthStore.setState({ token: null, user: null }));
    let called = false;
    server.use(http.get(`${BASE}/bookings/mine`, () => { called = true; return HttpResponse.json([]); }));

    const { result } = renderHook(
      () => useRenterVehicleOverlap('v1', '2026-10-06T09:00:00+03:00', '2026-10-08T09:00:00+03:00'),
      { wrapper }
    );
    expect(result.current.isBooked).toBe(false);
    expect(called).toBe(false);
  });
});
