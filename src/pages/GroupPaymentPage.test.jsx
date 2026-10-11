// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useCartStore } from '../store/cartStore';
import GroupPaymentPage from './GroupPaymentPage';

const BASE = 'http://192.168.8.11:8080/api/v1';

function Where() {
  const { pathname, state } = useLocation();
  return <p data-testid="where" data-booking={state?.bookingId || ''}>{pathname}</p>;
}

function renderAt(route = '/book/group/g1/payment') {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/book/group/:groupId/payment" element={<GroupPaymentPage />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const line = (vehicleId, model, dailyPrice, bookingId) => ({
  vehicleId,
  startTime: '2026-10-01T09:00:00Z',
  endTime: '2026-10-04T09:00:00Z',
  bookingMode: 'CHAUFFEURED',
  vehicle: { id: vehicleId, model, dailyPrice, photos: [] },
  bookingId,
  contractAccepted: true,
});

function seedGroup(items) {
  useCartStore.setState({ items, groupId: 'g1', contact: null });
}

beforeEach(() => {
  seedGroup([]);
  sessionStorage.clear();
});

function serveBooking(id, status = 'CONFIRMED') {
  server.use(http.get(`${BASE}/bookings/${id}`, () => HttpResponse.json({ id, status })));
}

describe('GroupPaymentPage — one payment for every vehicle in the group', () => {
  it('shows every vehicle and the combined total', () => {
    seedGroup([line('a', 'Prado', 15000, 'bk-1'), line('b', 'Alphard', 20000, 'bk-2')]);
    renderAt();

    expect(screen.getByRole('heading', { name: 'Prado' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alphard' })).toBeInTheDocument();
    expect(screen.getByText(/one payment for all 2 vehicles/i)).toBeInTheDocument();
  });

  it('re-checks every booking before charging, and blocks if one has just been declined', async () => {
    const user = userEvent.setup();
    let checkedOut = false;
    seedGroup([line('a', 'Prado', 15000, 'bk-1'), line('b', 'Alphard', 20000, 'bk-2')]);
    serveBooking('bk-1', 'CONFIRMED');
    serveBooking('bk-2', 'REJECTED');
    server.use(http.post(`${BASE}/payments/pesapal/booking-groups/:groupId/checkout`, () => { checkedOut = true; return HttpResponse.json({}); }));
    renderAt();

    await user.click(screen.getByRole('button', { name: /proceed to payment/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't fulfil this booking/i);
    expect(checkedOut).toBe(false);
  });

  it('starts Pesapal checkout for the whole group when every booking still stands', async () => {
    const user = userEvent.setup();
    let checkedOutGroupId;
    seedGroup([line('a', 'Prado', 15000, 'bk-1'), line('b', 'Alphard', 20000, 'bk-2')]);
    serveBooking('bk-1');
    serveBooking('bk-2');
    server.use(
      http.post(`${BASE}/payments/pesapal/booking-groups/:groupId/checkout`, ({ params }) => {
        checkedOutGroupId = params.groupId;
        return HttpResponse.json({ redirectUrl: 'https://pay.pesapal.com/checkout?group=g1' });
      })
    );
    renderAt();

    await user.click(screen.getByRole('button', { name: /proceed to payment/i }));

    await waitFor(() => expect(checkedOutGroupId).toBe('g1'));
    await waitFor(() => expect(sessionStorage.getItem('group-checkout:g1')).toBe('1'));
  });

  it('offers to sign once every booking in the group reports a successful payment', async () => {
    const user = userEvent.setup();
    seedGroup([line('a', 'Prado', 15000, 'bk-1'), line('b', 'Alphard', 20000, 'bk-2')]);
    sessionStorage.setItem('group-checkout:g1', '1');
    server.use(
      http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, ({ params }) =>
        HttpResponse.json({ status: 'SUCCESSFUL', bookingId: params.bookingId })
      )
    );
    renderAt();

    await user.click(await screen.findByRole('button', { name: /continue to sign contracts/i }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/book/bk-1/sign'));
    expect(screen.getByTestId('where')).toHaveAttribute('data-booking', 'bk-1');
  });

  it("doesn't poll payment status until the renter actually clicks through to Pesapal", async () => {
    const user = userEvent.setup();
    let statusChecks = 0;
    seedGroup([line('a', 'Prado', 15000, 'bk-1')]);
    serveBooking('bk-1', 'CONFIRMED');
    server.use(
      http.post(`${BASE}/payments/pesapal/booking-groups/:groupId/checkout`, () =>
        HttpResponse.json({ redirectUrl: 'https://pay.pesapal.com/checkout?group=g1' })
      ),
      http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () => {
        statusChecks += 1;
        return HttpResponse.json({ message: 'Payment not found' }, { status: 404 });
      })
    );
    renderAt();

    await user.click(screen.getByRole('button', { name: /proceed to payment/i }));
    const link = await screen.findByRole('link', { name: /continue to payment/i });
    const checksBeforeClick = statusChecks;

    await user.click(link);
    await waitFor(() => expect(statusChecks).toBeGreaterThan(checksBeforeClick));
  });

  it('a fast double-click on "Proceed to Payment" only ever starts one checkout', async () => {
    let checkoutCalls = 0;
    seedGroup([line('a', 'Prado', 15000, 'bk-1')]);
    serveBooking('bk-1', 'CONFIRMED');
    server.use(
      http.post(`${BASE}/payments/pesapal/booking-groups/:groupId/checkout`, () => {
        checkoutCalls += 1;
        return HttpResponse.json({ redirectUrl: 'https://pay.pesapal.com/checkout?group=g1' });
      })
    );
    renderAt();

    const payButton = screen.getByRole('button', { name: /proceed to payment/i });
    fireEvent.click(payButton);
    fireEvent.click(payButton);

    await screen.findByRole('link', { name: /continue to payment/i });
    expect(checkoutCalls).toBe(1);
  });

  it('shows nothing to pay for when there is no group', () => {
    seedGroup([]);
    renderAt();
    expect(screen.getByText(/couldn't find this group booking/i)).toBeInTheDocument();
  });
});

describe('GroupPaymentPage — resuming a payment the local "checkout started" flag lost track of', () => {
  it('skips straight to "Continue to Sign Contracts" when every booking already has a successful payment, without the flag ever being set', async () => {
    seedGroup([line('a', 'Prado', 15000, 'bk-1'), line('b', 'Alphard', 20000, 'bk-2')]);
    // sessionStorage was cleared in beforeEach — nothing says checkout was ever started here.
    server.use(http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () => HttpResponse.json({ status: 'SUCCESSFUL' })));
    renderAt();

    expect(await screen.findByRole('button', { name: /continue to sign contracts/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /proceed to payment/i })).not.toBeInTheDocument();
  });

  it('still offers "Proceed to Payment" when neither booking in the group was ever checked out', async () => {
    seedGroup([line('a', 'Prado', 15000, 'bk-1'), line('b', 'Alphard', 20000, 'bk-2')]);
    // The default mock handler already answers 404 "Payment not found" for both, matching the real backend.
    renderAt();

    expect(await screen.findByRole('button', { name: /proceed to payment/i })).toBeInTheDocument();
  });
});
