// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

const realLocation = window.location;
let assign;
beforeEach(() => {
  sessionStorage.clear();
  assign = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, assign } });
});
afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

function serveCheckout(onCall = () => {}) {
  server.use(
    http.post(`${BASE}/payments/pesapal/bookings/:bookingId/checkout`, ({ params }) => {
      onCall(params.bookingId);
      return HttpResponse.json({ redirectUrl: `https://pay.pesapal.com/checkout?booking=${params.bookingId}` });
    })
  );
}

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

  it('retrying re-starts checkout for the same booking and goes straight to the new Pesapal link', async () => {
    const user = userEvent.setup();
    let checkedOutFor = null;
    serveBooking();
    serveStatus('FAILED');
    serveCheckout((id) => { checkedOutFor = id; });
    renderAt('/payment/success?bookingId=b1');

    await user.click(await screen.findByRole('button', { name: /try again/i }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.pesapal.com/checkout?booking=b1'));
    expect(checkedOutFor).toBe('b1');
  });

  it('starts only one checkout for a double-click', async () => {
    const user = userEvent.setup();
    let calls = 0;
    serveBooking();
    serveStatus('FAILED');
    serveCheckout(() => { calls += 1; });
    renderAt('/payment/success?bookingId=b1');

    const retry = await screen.findByRole('button', { name: /try again/i });
    await user.dblClick(retry);
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    expect(calls).toBe(1);
  });

  it('lets someone who backed out of Pesapal (status never settles) pay again or check again', async () => {
    const user = userEvent.setup();
    serveBooking();
    serveStatus('PENDING');
    serveCheckout();
    renderAt('/payment/success?bookingId=b1');

    expect(await screen.findByRole('button', { name: /check again/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://pay.pesapal.com/checkout?booking=b1'));
  });

  it("stops waiting and says why when the status check itself fails (e.g. the backend can't reach Pesapal)", async () => {
    const user = userEvent.setup();
    serveBooking();
    server.use(
      http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () =>
        HttpResponse.json({ message: 'Pesapal response missing token' }, { status: 500 })
      )
    );
    serveCheckout();
    renderAt('/payment/success?bookingId=b1');

    expect(await screen.findByText("Couldn't check your payment")).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/internal error \(500\)/i);
    expect(screen.queryByText(/waiting for your payment/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(assign).toHaveBeenCalled());
  });

  it('keeps a waiting state while still pending', async () => {
    serveBooking();
    serveStatus('PENDING');
    renderAt('/payment/success?bookingId=b1');

    expect(await screen.findByText(/waiting for your payment to be confirmed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue to sign contract/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });
});
