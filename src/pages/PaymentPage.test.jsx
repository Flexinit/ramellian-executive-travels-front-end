// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import PaymentPage from './PaymentPage';

const BASE = 'http://192.168.8.11:8080/api/v1';

function renderAt(bookingId = 'b1', vehicleId = 'v1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: `/book/${vehicleId}/payment`, state: { bookingId } }]}>
          <Routes>
            <Route path="/book/:vehicleId/payment" element={<PaymentPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function serveBooking(statusOrFn) {
  server.use(
    http.get(`${BASE}/bookings/:id`, ({ params }) =>
      HttpResponse.json({
        id: params.id,
        vehicleId: 'v1',
        status: typeof statusOrFn === 'function' ? statusOrFn() : statusOrFn,
      })
    )
  );
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('PaymentPage — a booking that no longer holds', () => {
  it('lets a bookable booking start Pesapal checkout', async () => {
    const user = userEvent.setup();
    let checkedOut = false;
    serveBooking('CONFIRMED');
    server.use(
      http.post(`${BASE}/payments/pesapal/bookings/:bookingId/checkout`, () => {
        checkedOut = true;
        return HttpResponse.json({ redirectUrl: 'https://pay.pesapal.com/checkout?booking=b1' });
      })
    );
    renderAt();

    await user.click(await screen.findByRole('button', { name: /proceed to payment/i }));

    await waitFor(() => expect(checkedOut).toBe(true));
    await waitFor(() => expect(sessionStorage.getItem('checkout:b1')).toBe('1'));
  });

  it("doesn't poll payment status until the renter actually clicks through to Pesapal", async () => {
    const user = userEvent.setup();
    let statusChecks = 0;
    serveBooking('CONFIRMED');
    server.use(
      http.post(`${BASE}/payments/pesapal/bookings/:bookingId/checkout`, () =>
        HttpResponse.json({ redirectUrl: 'https://pay.pesapal.com/checkout?booking=b1' })
      ),
      // 404 "not found" is what a booking that's never been checked out really gets (see the "still offers
      // Proceed to Payment" test below) — kept here too so `useExistingPaymentCheck`'s own pre-click read
      // doesn't itself look like an existing payment and trigger the *other* resume path.
      http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () => {
        statusChecks += 1;
        return HttpResponse.json({ message: 'Payment not found' }, { status: 404 });
      })
    );
    renderAt();

    await user.click(await screen.findByRole('button', { name: /proceed to payment/i }));
    const link = await screen.findByRole('link', { name: /continue to payment/i });
    const checksBeforeClick = statusChecks;

    await user.click(link);
    await waitFor(() => expect(statusChecks).toBeGreaterThan(checksBeforeClick));
  });

  it('a fast double-click on "Proceed to Payment" only ever starts one checkout', async () => {
    let checkoutCalls = 0;
    serveBooking('CONFIRMED');
    server.use(
      http.post(`${BASE}/payments/pesapal/bookings/:bookingId/checkout`, () => {
        checkoutCalls += 1;
        return HttpResponse.json({ redirectUrl: 'https://pay.pesapal.com/checkout?booking=b1' });
      })
    );
    renderAt();

    const payButton = await screen.findByRole('button', { name: /proceed to payment/i });
    // Two clicks fired back-to-back with no await between them — before React has a chance to re-render
    // and disable the button — the same race a renter's own fast double-click (or a slow network masking
    // that the first click registered) could trigger.
    fireEvent.click(payButton);
    fireEvent.click(payButton);

    await screen.findByRole('link', { name: /continue to payment/i });
    expect(checkoutCalls).toBe(1);
  });

  it('shows no warning for a booking that still stands', async () => {
    serveBooking('CONFIRMED');
    renderAt();

    expect(await screen.findByRole('button', { name: /proceed to payment/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it("re-checks right before charging, and stops without paying if it's just been declined", async () => {
    const user = userEvent.setup();
    let status = 'CONFIRMED';
    let checkedOut = false;
    serveBooking(() => status);
    server.use(http.post(`${BASE}/payments/pesapal/bookings/:bookingId/checkout`, () => { checkedOut = true; return HttpResponse.json({}); }));
    renderAt();

    const payButton = await screen.findByRole('button', { name: /proceed to payment/i });
    // The owner declines it the instant before the renter clicks Pay.
    status = 'REJECTED';
    await user.click(payButton);

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't fulfil this booking/i);
    expect(screen.queryByRole('button', { name: /proceed to payment/i })).not.toBeInTheDocument();
    expect(checkedOut).toBe(false);
    expect(sessionStorage.getItem('checkout:b1')).toBeNull();
  });

  it('shows the notice up front for a booking that was already declined on arrival', async () => {
    serveBooking('REJECTED');
    renderAt();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't fulfil this booking/i);
    expect(screen.queryByRole('button', { name: /proceed to payment/i })).not.toBeInTheDocument();
  });
});

describe('PaymentPage — resuming a payment the local "checkout started" flag lost track of', () => {
  it('skips straight to "Continue to Sign Contract" for a booking already paid, without ever offering to pay again', async () => {
    serveBooking('CONFIRMED');
    server.use(http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () => HttpResponse.json({ status: 'SUCCESSFUL' })));
    renderAt(); // sessionStorage was cleared in beforeEach — nothing says checkout was ever started here

    expect(await screen.findByRole('button', { name: /continue to sign contract/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /proceed to payment/i })).not.toBeInTheDocument();
  });

  it('resumes the normal "confirming payment" view for a payment left mid-flight', async () => {
    serveBooking('CONFIRMED');
    server.use(http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () => HttpResponse.json({ status: 'PENDING' })));
    renderAt();

    expect(await screen.findByText(/confirming your payment/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /proceed to payment/i })).not.toBeInTheDocument();
  });

  it('still offers "Proceed to Payment" for a booking that was genuinely never checked out', async () => {
    serveBooking('CONFIRMED');
    // The default mock handler already answers 404 "Payment not found" for this, matching the real backend.
    renderAt();

    expect(await screen.findByRole('button', { name: /proceed to payment/i })).toBeInTheDocument();
  });
});
