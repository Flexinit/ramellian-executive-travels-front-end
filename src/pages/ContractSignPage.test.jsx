// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import { stashContractId } from '../lib/contracts';
import ContractSignPage from './ContractSignPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function LocationProbe() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderAt(id) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/contracts/${id}/sign`]}>
          <LocationProbe />
          <Routes>
            <Route path="/contracts/:contractId/sign" element={<ContractSignPage />} />
            <Route path="*" element={null} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

// c-1 is a contract for booking b-1; any other id is not a contract. b-1 is a booking the owner's renter made.
function serve({ renterEmail = 'renter@example.com' } = {}) {
  server.use(
    http.get(`${BASE}/payments/contracts/:id`, ({ params }) =>
      params.id === 'c-1'
        ? HttpResponse.json({ id: 'c-1', bookingId: 'b-1', contractText: 'Terms', renterSignedAt: '2026-11-09T10:00:00' })
        : HttpResponse.json({ message: 'Contract not found' }, { status: 404 })
    ),
    http.get(`${BASE}/bookings/:id`, ({ params }) =>
      params.id === 'b-1'
        ? HttpResponse.json({ id: 'b-1', status: 'CONFIRMED', renterName: 'Ann Renter', renterEmail, startTime: '2026-11-11T09:00:00', endTime: '2026-11-12T09:00:00' })
        : HttpResponse.json({ message: 'Booking not found' }, { status: 404 })
    )
  );
}

beforeEach(() => {
  act(() => useAuthStore.setState({ token: 't', user: { id: 'o', email: 'owner@example.com', roles: ['OWNER'] } }));
});

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  act(() => useAuthStore.setState({ token: null, user: null }));
});

describe('ContractSignPage', () => {
  it('shows the owner Read & sign for a contract id', async () => {
    serve();
    renderAt('c-1');
    expect(await screen.findByRole('button', { name: /read & sign/i })).toBeInTheDocument();
  });

  it('reads a booking id (a sign request that points at the booking) and opens the contract this device knows', async () => {
    serve();
    stashContractId('b-1', 'c-1');
    renderAt('b-1');
    expect(await screen.findByRole('button', { name: /read & sign/i })).toBeInTheDocument();
  });

  it('finds the contract by booking on a device that never saw it (GET /payments/bookings/{id}/contract)', async () => {
    serve();
    server.use(
      http.get(`${BASE}/payments/bookings/:bookingId/contract`, () =>
        HttpResponse.json({ id: 'c-1', bookingId: 'b-1', contractText: 'Terms', renterSignedAt: '2026-11-09T10:00:00' })
      )
    );
    renderAt('b-1');
    expect(await screen.findByRole('button', { name: /read & sign/i })).toBeInTheDocument();
  });

  it('says there is no contract to sign yet when the booking has none, with a way to the booking', async () => {
    serve();
    renderAt('b-1');
    expect(await screen.findByRole('heading', { name: /no contract to sign yet/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view booking/i })).toHaveAttribute('href', '/owner/bookings/b-1');
  });

  it('sends the booking’s renter to the renter signing page', async () => {
    serve({ renterEmail: 'owner@example.com' });
    renderAt('b-1');
    expect(await screen.findByText('/book/b-1/sign')).toBeInTheDocument();
  });

  it('says it could not open an id that is neither a contract nor a booking', async () => {
    serve();
    renderAt('nope');
    expect(await screen.findByText(/contract not found/i)).toBeInTheDocument();
  });
});
