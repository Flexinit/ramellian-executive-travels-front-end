// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import OwnerBookingDetailPage from './OwnerBookingDetailPage';

const BASE = 'http://192.168.8.11:8080/api/v1';

function renderAt(bookingId = 'b1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/admin/bookings/${bookingId}`]}>
          <Routes>
            <Route path="/admin/bookings/:bookingId" element={<OwnerBookingDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function serveBooking(overrides = {}) {
  server.use(
    http.get(`${BASE}/bookings/:id`, ({ params }) =>
      HttpResponse.json({ id: params.id, vehicleId: 'v1', status: 'CONFIRMED', numberOfDays: 3, startTime: '2026-10-01T09:00:00Z', endTime: '2026-10-04T09:00:00Z', ...overrides })
    )
  );
}

afterEach(() => {
  sessionStorage.clear();
});

describe('OwnerBookingDetailPage — contract section', () => {
  it('shows nothing when this browser session never drafted this booking\'s contract', async () => {
    serveBooking();
    renderAt();

    await screen.findByRole('heading', { name: /booking/i });
    expect(screen.queryByText('Contract')).not.toBeInTheDocument();
  });

  it('shows Unsigned/Signed PDF links when this session has the contract id stashed', async () => {
    sessionStorage.setItem('contract:b1', 'c1');
    serveBooking();
    renderAt();

    expect(await screen.findByText('Contract')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unsigned PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Signed PDF' })).toBeInTheDocument();
  });
});
