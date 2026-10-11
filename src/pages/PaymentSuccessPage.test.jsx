// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function serveStatus(status) {
  server.use(http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () => HttpResponse.json({ status })));
}

beforeEach(() => sessionStorage.clear());

describe('PaymentSuccessPage — where Pesapal redirects back to', () => {
  it("reads the booking from a stale link with nothing to go on, and says so", async () => {
    renderAt('/payment/success');
    expect(await screen.findByText(/couldn't tell which booking/i)).toBeInTheDocument();
  });

  it('reads the booking id from the URL and polls its Pesapal status', async () => {
    serveBooking();
    serveStatus('SUCCESSFUL');
    renderAt('/payment/success?bookingId=b1');

    expect(await screen.findByText(/payment successful/i)).toBeInTheDocument();
  });

  it('falls back to the id usePesapalCheckout stashed before redirecting, when the URL has none', async () => {
    sessionStorage.setItem('lastCheckoutBookingId', 'b1');
    serveBooking();
    serveStatus('SUCCESSFUL');
    renderAt('/payment/success');

    expect(await screen.findByText(/payment successful/i)).toBeInTheDocument();
  });

  it('offers to continue to sign, using the vehicle id from the booking record (not the URL)', async () => {
    const user = userEvent.setup();
    serveBooking('v9');
    serveStatus('SUCCESSFUL');
    renderAt('/payment/success?bookingId=b1');

    await user.click(await screen.findByRole('button', { name: /continue to sign contract/i }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/book/v9/sign'));
    expect(screen.getByTestId('where')).toHaveAttribute('data-booking', 'b1');
  });

  it('shows the failure state with a retry, for a failed transaction', async () => {
    serveBooking();
    serveStatus('FAILED');
    renderAt('/payment/success?bookingId=b1');

    expect(await screen.findByText(/payment failed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue to sign contract/i })).not.toBeInTheDocument();
  });

  it('retrying re-starts checkout for the same booking', async () => {
    const user = userEvent.setup();
    let checkedOutFor = null;
    serveBooking();
    serveStatus('FAILED');
    server.use(
      http.post(`${BASE}/payments/pesapal/bookings/:bookingId/checkout`, ({ params }) => {
        checkedOutFor = params.bookingId;
        return HttpResponse.json({ redirectUrl: 'https://pay.pesapal.com/checkout?booking=b1' });
      })
    );
    renderAt('/payment/success?bookingId=b1');

    await user.click(await screen.findByRole('button', { name: /try again/i }));
    await waitFor(() => expect(checkedOutFor).toBe('b1'));
  });

  it('keeps a plain waiting state while still pending', async () => {
    serveBooking();
    serveStatus('PENDING');
    renderAt('/payment/success?bookingId=b1');

    expect(await screen.findByText(/waiting for your payment to be confirmed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue to sign contract/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});
