// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import PaymentPage from './PaymentPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderAt(bookingId = 'b1', vehicleId = 'v1', extraState = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: `/book/${vehicleId}/payment`, state: { bookingId, ...extraState } }]}>
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

/** Chooses "Card & other" (M-Pesa is the default) and pays through Pesapal. */
async function payByCard(user) {
  await user.click(await screen.findByRole('radio', { name: 'Card & other' }));
  await user.click(screen.getByRole('button', { name: /proceed to payment/i }));
}

function serveCheckout(onCall = () => {}) {
  server.use(
    http.post(`${BASE}/payments/pesapal/bookings/:bookingId/checkout`, ({ params }) => {
      onCall(params.bookingId);
      return HttpResponse.json({ redirectUrl: `https://pay.pesapal.com/checkout?booking=${params.bookingId}` });
    })
  );
}

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

    await payByCard(user);

    await waitFor(() => expect(checkedOut).toBe(true));
    await waitFor(() => expect(sessionStorage.getItem('checkout:b1')).toBe('1'));
    // Pesapal's page opens right here, in a frame — the browser doesn't leave the site.
    expect(await screen.findByTitle('Pesapal secure payment')).toHaveAttribute('src', 'https://pay.pesapal.com/checkout?booking=b1');
    expect(assign).not.toHaveBeenCalled();
  });

  it("doesn't poll payment status until the payment in the frame is finished", async () => {
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

    await payByCard(user);
    await screen.findByTitle('Pesapal secure payment');
    const checksBeforeClick = statusChecks;

    await user.click(screen.getByRole('button', { name: /i've finished paying/i }));
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

    await userEvent.setup().click(await screen.findByRole('radio', { name: 'Card & other' }));
    const payButton = await screen.findByRole('button', { name: /proceed to payment/i });
    // Two clicks fired back-to-back with no await between them — before React has a chance to re-render
    // and disable the button — the same race a renter's own fast double-click (or a slow network masking
    // that the first click registered) could trigger.
    fireEvent.click(payButton);
    fireEvent.click(payButton);

    await screen.findByTitle('Pesapal secure payment');
    expect(checkoutCalls).toBe(1);
  });

  it('shows no warning for a booking that still stands', async () => {
    serveBooking('CONFIRMED');
    renderAt();

    expect(await screen.findByRole('radiogroup', { name: 'How to pay' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it("re-checks right before charging, and stops without paying if it's just been declined", async () => {
    const user = userEvent.setup();
    let status = 'CONFIRMED';
    let checkedOut = false;
    serveBooking(() => status);
    server.use(http.post(`${BASE}/payments/pesapal/bookings/:bookingId/checkout`, () => { checkedOut = true; return HttpResponse.json({}); }));
    renderAt();

    await user.click(await screen.findByRole('radio', { name: 'Card & other' }));
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

  it('a payment started earlier but never confirmed still opens on the choice of how to pay — with a note to check it', async () => {
    const user = userEvent.setup();
    let paid = false;
    serveBooking('CONFIRMED');
    server.use(http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () => HttpResponse.json({ status: paid ? 'SUCCESSFUL' : 'PENDING' })));
    renderAt();

    expect(await screen.findByText(/you started a payment for this booking earlier/i)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'How to pay' })).toBeInTheDocument();
    expect(screen.queryByText(/waiting for your payment to be confirmed/i)).not.toBeInTheDocument();

    // It had gone through after all: checking it moves on to the result.
    paid = true;
    await user.click(screen.getByRole('button', { name: /check its status/i }));
    expect(await screen.findByText('Payment successful')).toBeInTheDocument();
  });

  it('never shows "waiting for confirmation" before the renter has been asked to pay, even with an old flag', async () => {
    sessionStorage.setItem('checkout:b1', '1');
    serveBooking('CONFIRMED');
    renderAt();
    expect(await screen.findByRole('radiogroup', { name: 'How to pay' })).toBeInTheDocument();
    expect(screen.queryByText(/waiting for your payment to be confirmed/i)).not.toBeInTheDocument();
  });

  it('still offers "Proceed to Payment" for a booking that was genuinely never checked out', async () => {
    serveBooking('CONFIRMED');
    // The default mock handler already answers 404 "Payment not found" for this, matching the real backend.
    renderAt();

    expect(await screen.findByRole('radiogroup', { name: 'How to pay' })).toBeInTheDocument();
  });
});

describe('PaymentPage — back from Pesapal (PaymentSuccessPage sets the checkout flag and hands over here)', () => {
  beforeEach(() => sessionStorage.setItem('checkout:b1', '1'));

  it('a failed payment offers Try Again, which opens a fresh Pesapal checkout in the frame', async () => {
    const user = userEvent.setup();
    let calls = 0;
    serveBooking('PENDING');
    server.use(http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () => HttpResponse.json({ status: 'FAILED' })));
    serveCheckout(() => { calls += 1; });
    renderAt('b1', 'v1', { returnedFromPesapal: true });

    expect(await screen.findByText(/payment failed/i)).toBeInTheDocument();
    await user.dblClick(screen.getByRole('button', { name: /try again/i }));
    // The old attempt's "failed" is forgotten: the fresh link opens in the frame.
    expect(await screen.findByTitle('Pesapal secure payment')).toHaveAttribute('src', 'https://pay.pesapal.com/checkout?booking=b1');
    expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument();
    expect(calls).toBe(1);
  });

  it('someone who backed out of Pesapal (status never settles) can pay again or check again right away', async () => {
    const user = userEvent.setup();
    serveBooking('PENDING');
    server.use(http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () => HttpResponse.json({ status: 'PENDING' })));
    serveCheckout();
    renderAt('b1', 'v1', { returnedFromPesapal: true });

    expect(await screen.findByRole('button', { name: /check again/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /continue to payment/i }));
    expect(await screen.findByTitle('Pesapal secure payment')).toBeInTheDocument();
  });

  it('a payment started before the other options existed can switch to M-Pesa, splitting or card', async () => {
    const user = userEvent.setup();
    serveBooking('PENDING');
    server.use(http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () => HttpResponse.json({ status: 'PENDING' })));
    renderAt('b1', 'v1', { returnedFromPesapal: true });

    await user.click(await screen.findByRole('button', { name: /choose another way to pay/i }));
    expect(await screen.findByRole('radio', { name: 'M-Pesa' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Split the cost' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Card & other' })).toBeInTheDocument();
    expect(sessionStorage.getItem('checkout:b1')).toBeNull();
  });

  it("stops waiting and says why when the status check itself fails (e.g. the backend can't reach Pesapal)", async () => {
    serveBooking('PENDING');
    server.use(
      http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () =>
        HttpResponse.json({ message: 'Pesapal response missing token' }, { status: 500 })
      )
    );
    renderAt('b1', 'v1', { returnedFromPesapal: true });

    expect(await screen.findByText("Couldn't check your payment")).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/internal error \(500\)/i);
    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});

describe('PaymentPage — the way back', () => {
  it('goes back to the contract before paying', async () => {
    serveBooking('PENDING');
    renderAt();
    expect(await screen.findByRole('link', { name: /back to contract/i })).toHaveAttribute('href', '/book/b1/contract');
  });

  it('offers the booking itself once paid, not the contract', async () => {
    serveBooking('CONFIRMED');
    server.use(http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () => HttpResponse.json({ status: 'SUCCESSFUL' })));
    renderAt();
    expect(await screen.findByRole('link', { name: /view booking/i })).toHaveAttribute('href', '/dashboard/bookings/b1');
    expect(screen.queryByRole('link', { name: /back to contract/i })).not.toBeInTheDocument();
  });
});
