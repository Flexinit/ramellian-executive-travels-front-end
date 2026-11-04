// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import PaymentPage from './PaymentPage';
import { useAuthStore } from '../store/authStore';
import { splitEqually, splitTotal } from '../hooks/useSplitPayment';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderAt() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster />
        <MemoryRouter initialEntries={[{ pathname: '/book/v1/payment', state: { bookingId: 'b1' } }]}>
          <Routes>
            <Route path="/book/:vehicleId/payment" element={<PaymentPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const contribution = (over) => ({ contributionId: 'c1', payerName: 'Ann Renter', payerPhone: '254712345678', amount: 4501, status: 'PENDING', ...over });
const splitResponse = (over) => ({
  splitGroupId: 's1', bookingId: 'b1', groupStatus: 'PENDING', totalAmount: 9001, totalPaid: 0, totalOutstanding: 9001,
  expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  contributions: [contribution(), contribution({ contributionId: 'c2', payerName: 'Ben Friend', payerPhone: '254722000111', amount: 4500 })],
  ...over,
});

beforeEach(() => {
  sessionStorage.clear();
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  useAuthStore.getState().setUser({ firstName: 'Ann', lastName: 'Renter', email: 'ann@example.com', phoneNumber: '+254712345678' });
  server.use(http.get(`${BASE}/bookings/:id`, ({ params }) => HttpResponse.json({ id: params.id, vehicleId: 'v1', status: 'CONFIRMED', estimatedAmount: 9001 })));
});

describe('splitEqually', () => {
  it('shares a total in whole shillings that always add back up, the odd shilling on the first', () => {
    expect(splitEqually(9001, 2)).toEqual([4501, 4500]);
    expect(splitEqually(100, 3)).toEqual([34, 33, 33]);
    expect(splitEqually(100, 3).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('splitTotal', () => {
  it("is the booking's whole charge — rental, delivery, driver and the M-Pesa fees — with nothing on top for payers", () => {
    const t = splitTotal({ baseAmount: 15000, deliveryFee: 1000, driverCharge: 0 }, { mpesaStkFee: 30, mpesaB2cFee: 25 });
    expect(t.total).toBe(16055);
    expect(t.lines.map((l) => [l.label, l.amount])).toEqual([['Rental', 15000], ['Delivery', 1000], ['Processing fee', 55]]);
    expect(splitTotal({ estimatedAmount: 9001 }).total).toBe(9001);
  });
});

describe('PaymentPage — split the cost', () => {
  async function chooseSplit(user) {
    await user.click(await screen.findByRole('radio', { name: 'Split the cost' }));
    return screen.getByRole('form', { name: 'Split the cost' });
  }

  it('the renter lists who pays what; everyone gets a prompt; the page follows the payments until all are in', async () => {
    const user = userEvent.setup();
    let body;
    let state = splitResponse();
    server.use(
      http.post(`${BASE}/payments/mpesa/bookings/b1/split`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(state);
      }),
      http.get(`${BASE}/payments/mpesa/bookings/b1/split`, () => HttpResponse.json(state))
    );
    renderAt();
    const form = await chooseSplit(user);

    // You first — your own details — and the total shared out between two people to start.
    const people = within(form).getAllByRole('listitem');
    expect(people).toHaveLength(2);
    expect(within(people[0]).getByLabelText('Your name')).toHaveValue('Ann Renter');
    expect(within(people[0]).getByLabelText('M-Pesa number')).toHaveValue('+254712345678');
    expect(within(people[0]).getByLabelText('Their share (KES)')).toHaveValue(4501);
    expect(within(people[1]).getByLabelText('Their share (KES)')).toHaveValue(4500);
    expect(within(form).getByText('Adds up ✓')).toBeInTheDocument();

    await user.type(within(people[1]).getByLabelText('Name'), 'Ben Friend');
    await user.type(within(people[1]).getByLabelText('M-Pesa number'), '0722 000 111');
    await user.click(within(form).getByRole('button', { name: /send 2 payment requests/i }));

    await waitFor(() => expect(body).toEqual({
      contributors: [
        { payerPhone: '254712345678', payerName: 'Ann Renter', payerEmail: 'ann@example.com', amount: 4501 },
        { payerPhone: '254722000111', payerName: 'Ben Friend', amount: 4500 },
      ],
      expiryMinutes: 60,
    }));

    expect(await screen.findByText('Waiting for everyone to pay')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Paid so far' })).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('(you)')).toBeInTheDocument();

    // Everyone pays: the page moves on to the contract by itself.
    state = splitResponse({
      groupStatus: 'COMPLETE', totalPaid: 9001, totalOutstanding: 0,
      contributions: [contribution({ status: 'PAID', receipt: 'QWE123' }), contribution({ contributionId: 'c2', payerName: 'Ben Friend', amount: 4500, status: 'PAID' })],
    });
    expect(await screen.findByText('Payment successful', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue to sign contract/i })).toBeInTheDocument();
  }, 15000);

  it("won't send until the shares add up, every number is a Kenyan line, and no number is listed twice", async () => {
    const user = userEvent.setup();
    let sent = false;
    server.use(http.post(`${BASE}/payments/mpesa/bookings/b1/split`, () => { sent = true; return HttpResponse.json(splitResponse()); }));
    renderAt();
    const form = await chooseSplit(user);
    const people = within(form).getAllByRole('listitem');

    await user.type(within(people[1]).getByLabelText('Name'), 'Ben');
    await user.type(within(people[1]).getByLabelText('M-Pesa number'), '0712 345 678');
    const share = within(people[1]).getByLabelText('Their share (KES)');
    await user.clear(share);
    await user.type(share, '4000');
    expect(within(form).getByText('KES 500 left')).toBeInTheDocument();

    await user.click(within(form).getByRole('button', { name: /send 2 payment requests/i }));
    expect(within(form).getByText('This number is already on the list.')).toBeInTheDocument();
    expect(within(form).getByRole('alert')).toHaveTextContent('KES 500 still to share out.');
    expect(sent).toBe(false);

    // Split equally puts it right.
    await user.click(within(form).getByRole('button', { name: /split equally/i }));
    expect(within(form).getByText('Adds up ✓')).toBeInTheDocument();
  });

  it('shares out the whole charge, M-Pesa fees included, and says what it is made of', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${BASE}/bookings/:id`, ({ params }) => HttpResponse.json({ id: params.id, vehicleId: 'v1', status: 'CONFIRMED', baseAmount: 15000, deliveryFee: 1000 })),
      http.get(`${BASE}/platform-settings`, () => HttpResponse.json({ mpesaStkFee: 30, mpesaB2cFee: 25 }))
    );
    renderAt();
    const form = await chooseSplit(user);
    expect(await within(form).findByText(/Rental KES 15,000 \+ Delivery KES 1,000 \+ Processing fee KES 55/)).toBeInTheDocument();
    await waitFor(() => expect(within(form).getAllByLabelText('Their share (KES)').map((el) => Number(el.value))).toEqual([8028, 8027]));
    expect(within(form).getByText('Adds up ✓')).toBeInTheDocument();
  });

  it('shows a payment M-Pesa is still confirming, without offering to resend it', async () => {
    sessionStorage.setItem('checkout:b1', '1');
    sessionStorage.setItem('checkout-provider:b1', 'split');
    server.use(http.get(`${BASE}/payments/mpesa/bookings/b1/split`, () => HttpResponse.json(splitResponse({
      groupStatus: 'PARTIAL', totalPaid: 4501, totalOutstanding: 4500,
      contributions: [contribution({ status: 'PAID' }), contribution({ contributionId: 'c2', payerName: 'Ben Friend', amount: 4500, status: 'PROCESSING' })],
    }))));
    renderAt();
    expect(await screen.findByText('Waiting for the rest to pay')).toBeInTheDocument();
    const ben = screen.getByText('Ben Friend').closest('li');
    expect(within(ben).getByText('Confirming')).toBeInTheDocument();
    expect(within(ben).queryByRole('button', { name: /resend prompt/i })).not.toBeInTheDocument();
  });

  it('adding a person shares the total out again', async () => {
    const user = userEvent.setup();
    renderAt();
    const form = await chooseSplit(user);
    await user.click(within(form).getByRole('button', { name: /add a person/i }));
    const shares = within(form).getAllByLabelText('Their share (KES)').map((el) => Number(el.value));
    expect(shares).toEqual([3001, 3000, 3000]);
  });

  it("resends one person's prompt", async () => {
    const user = userEvent.setup();
    let retried;
    sessionStorage.setItem('checkout:b1', '1');
    sessionStorage.setItem('checkout-provider:b1', 'split');
    server.use(
      http.get(`${BASE}/payments/mpesa/bookings/b1/split`, () => HttpResponse.json(splitResponse())),
      http.post(`${BASE}/payments/mpesa/bookings/b1/split/contributions/:id/retry`, ({ params }) => {
        retried = params.id;
        return HttpResponse.json(splitResponse());
      })
    );
    renderAt();

    const ben = (await screen.findByText('Ben Friend')).closest('li');
    await user.click(within(ben).getByRole('button', { name: /resend prompt/i }));
    await waitFor(() => expect(retried).toBe('c2'));
    expect(await screen.findByText('Prompt sent again.')).toBeInTheDocument();
  });

  it('when time runs out before everyone pays, says so and offers to start again', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('checkout:b1', '1');
    sessionStorage.setItem('checkout-provider:b1', 'split');
    server.use(http.get(`${BASE}/payments/mpesa/bookings/b1/split`, () => HttpResponse.json(splitResponse({
      groupStatus: 'EXPIRED', totalPaid: 4501, totalOutstanding: 4500,
      contributions: [contribution({ status: 'PAID' }), contribution({ contributionId: 'c2', payerName: 'Ben Friend', amount: 4500 })],
    }))));
    renderAt();

    expect(await screen.findByRole('alert')).toHaveTextContent(/not everyone paid in time/i);
    expect(screen.queryByRole('button', { name: /resend prompt/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /start again/i }));
    expect(await screen.findByRole('form', { name: 'Split the cost' })).toBeInTheDocument();
  });
});
