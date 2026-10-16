// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import PaymentSuccessPage from './PaymentSuccessPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function Where() {
  const { pathname, state } = useLocation();
  return (
    <p data-testid="where" data-booking={state?.bookingId || ''}>
      {pathname}
    </p>
  );
}

function renderAt(path = '/payment/success') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function serveBooking(vehicleId = 'v1') {
  server.use(http.get(`${BASE}/bookings/:id`, ({ params }) => HttpResponse.json({ id: params.id, vehicleId, status: 'CONFIRMED' })));
}

beforeEach(() => sessionStorage.clear());

describe('PaymentSuccessPage — where Pesapal redirects back to', () => {
  it('says so when there is nothing to tell which booking it was', async () => {
    renderAt('/payment/success');
    expect(await screen.findByText(/couldn't tell which booking/i)).toBeInTheDocument();
  });

  it("hands over to the booking's own Payment page, using the vehicle id from the booking record", async () => {
    serveBooking('v9');
    renderAt('/payment/success?bookingId=b1');

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/book/v9/payment'));
    expect(screen.getByTestId('where')).toHaveAttribute('data-booking', 'b1');
    // So the Payment page resumes checking this payment instead of offering to start one.
    expect(sessionStorage.getItem('checkout:b1')).toBe('1');
    expect(sessionStorage.getItem('booking:v9')).toBe('b1');
  });

  it('falls back to the id usePesapalCheckout stashed before redirecting, when the URL has none', async () => {
    sessionStorage.setItem('lastCheckoutBookingId', 'b1');
    serveBooking();
    renderAt('/payment/success');

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/book/v1/payment'));
  });
});
