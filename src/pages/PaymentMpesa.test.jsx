// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import PaymentPage from './PaymentPage';
import { useAuthStore } from '../store/authStore';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

/**
 * An M-Pesa status that behaves like the real one for a prompt that fails: nothing until the first prompt, then each
 * prompt reads PENDING (it's on the phone) before it reads FAILED (cancelled, wrong PIN…). `sent()` marks a new prompt.
 */
function failingPrompts() {
  let prompts = 0;
  let polls = 0;
  return {
    sent: () => { prompts += 1; polls = 0; },
    get prompts() { return prompts; },
    status: () => {
      if (!prompts) return HttpResponse.json({ message: 'Payment not found' }, { status: 404 });
      polls += 1;
      return HttpResponse.json({ status: polls === 1 ? 'PENDING' : 'FAILED' });
    },
  };
}

function renderAt() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: '/book/v1/payment', state: { bookingId: 'b1' } }]}>
          <Routes>
            <Route path="/book/:vehicleId/payment" element={<PaymentPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  sessionStorage.clear();
  useAuthStore.getState().setUser({ phoneNumber: '+254712345678' });
  server.use(http.get(`${BASE}/bookings/:id`, ({ params }) => HttpResponse.json({ id: params.id, vehicleId: 'v1', status: 'CONFIRMED' })));
});

describe('PaymentPage — paying by M-Pesa prompt (STK push)', () => {
  it("is the default: sends the prompt to the account's phone, then waits for the PIN and shows the result", async () => {
    const user = userEvent.setup();
    const sent = [];
    let paid = false;
    server.use(
      http.post(`${BASE}/payments/mpesa/bookings/:bookingId/checkout`, ({ request, params }) => {
        sent.push({ bookingId: params.bookingId, phone: new URL(request.url).searchParams.get('phone') });
        return HttpResponse.json({ provider: 'MPESA', status: 'PENDING' });
      }),
      http.get(`${BASE}/payments/mpesa/bookings/:bookingId/status`, () => HttpResponse.json({ status: paid ? 'SUCCESSFUL' : 'PENDING' }))
    );
    renderAt();

    expect(await screen.findByRole('radio', { name: 'M-Pesa' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('M-Pesa phone number')).toHaveValue('+254712345678');
    await user.click(screen.getByRole('button', { name: /send m-pesa prompt/i }));

    expect(await screen.findByText('Check your phone')).toBeInTheDocument();
    // Sent the way Safaricom writes numbers.
    expect(sent).toEqual([{ bookingId: 'b1', phone: '254712345678' }]);
    paid = true;
    expect(await screen.findByText('Payment successful', {}, { timeout: 8000 })).toBeInTheDocument();
  }, 15000);

  it('a booking already paid by M-Pesa elsewhere (another browser) opens on the result, not on paying again', async () => {
    server.use(
      http.get(`${BASE}/payments/mpesa/bookings/:bookingId/status`, () => HttpResponse.json({ provider: 'MPESA', status: 'SUCCESSFUL', amount: 84 }))
    );
    renderAt();

    expect(await screen.findByText('Payment successful')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send m-pesa prompt/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue to sign contract/i })).toBeInTheDocument();
  });

  it('shows the total the prompt will ask for — the rental plus the M-Pesa fees — and the card total when card is chosen', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${BASE}/bookings/:id`, ({ params }) => HttpResponse.json({ id: params.id, vehicleId: 'v1', status: 'CONFIRMED', baseAmount: 1, numberOfDays: 1 })),
      http.get(`${BASE}/platform-settings`, () => HttpResponse.json({ pesapalTransactionFeeRatePct: 1.5, mpesaStkFee: 33, mpesaB2cFee: 50 }))
    );
    renderAt();

    const summary = await screen.findByRole('list', { name: 'What you pay' }).catch(() => screen.findByLabelText('What you pay'));
    expect(summary).toHaveTextContent('Processing fee');
    expect(summary).toHaveTextContent('KES 83');
    expect(screen.getByText('Total to pay').parentElement).toHaveTextContent('84');

    await user.click(screen.getByRole('radio', { name: 'Card & other' }));
    expect(screen.getByLabelText('What you pay')).toHaveTextContent('Processing fee');
    expect(screen.getByLabelText('What you pay')).not.toHaveTextContent('KES 83');
  });

  it('counts down a minute for the PIN instead of spinning; when it runs out, waits for Try again', async () => {
    const user = userEvent.setup();
    let prompts = 0;
    sessionStorage.setItem('checkout:b1', '1');
    sessionStorage.setItem('checkout-provider:b1', 'mpesa');
    sessionStorage.setItem('checkout-phone:b1', '+254712345678');
    sessionStorage.setItem('checkout-prompted-at:b1', String(Date.now() - 61_000)); // sent over a minute ago
    server.use(
      http.get(`${BASE}/payments/mpesa/bookings/:bookingId/status`, () => HttpResponse.json({ status: 'PENDING' })),
      http.post(`${BASE}/payments/mpesa/bookings/:bookingId/checkout`, () => { prompts += 1; return HttpResponse.json({ status: 'PENDING' }); })
    );
    renderAt();

    expect(await screen.findByText(/didn.t get the prompt, or it timed out/i)).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^try again$/i }));

    // A fresh prompt, and a fresh minute on the clock.
    await waitFor(() => expect(prompts).toBe(1));
    expect(await screen.findByText('Check your phone')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveAccessibleName(/left to enter your m-pesa pin/i);
  });

  it("a prompt with no known send time counts as timed out — the countdown never restarts by itself", async () => {
    sessionStorage.setItem('checkout:b1', '1');
    sessionStorage.setItem('checkout-provider:b1', 'mpesa');
    sessionStorage.setItem('checkout-phone:b1', '+254712345678');
    server.use(http.get(`${BASE}/payments/mpesa/bookings/:bookingId/status`, () => HttpResponse.json({ status: 'PENDING' })));
    renderAt();

    expect(await screen.findByRole('button', { name: /^try again$/i })).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('only accepts a Kenyan number, before sending anything', async () => {
    const user = userEvent.setup();
    let sent = false;
    server.use(http.post(`${BASE}/payments/mpesa/bookings/:bookingId/checkout`, () => { sent = true; return HttpResponse.json({}); }));
    renderAt();

    const phone = await screen.findByLabelText('M-Pesa phone number');
    await user.clear(phone);
    await user.type(phone, '+44 20 7946 0958');
    await user.click(screen.getByRole('button', { name: /send m-pesa prompt/i }));
    expect(await screen.findByText(/enter a kenyan m-pesa number/i)).toBeInTheDocument();
    expect(sent).toBe(false);
  });

  it('after a failed prompt, Pay another way goes back to choosing — Card & other', async () => {
    const user = userEvent.setup();
    const mpesa = failingPrompts();
    server.use(
      http.post(`${BASE}/payments/mpesa/bookings/:bookingId/checkout`, () => { mpesa.sent(); return HttpResponse.json({ status: 'PENDING' }); }),
      http.get(`${BASE}/payments/mpesa/bookings/:bookingId/status`, () => mpesa.status())
    );
    renderAt();
    await user.click(await screen.findByRole('button', { name: /send m-pesa prompt/i }));
    expect(await screen.findByText(/payment failed/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /choose another way to pay/i }));
    expect(await screen.findByRole('radio', { name: 'Card & other' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /proceed to payment/i })).toBeInTheDocument();
  });

  it('after a failed prompt, says what can go wrong, and Use a different number goes back to the number', async () => {
    const user = userEvent.setup();
    const mpesa = failingPrompts();
    server.use(
      http.post(`${BASE}/payments/mpesa/bookings/:bookingId/checkout`, () => { mpesa.sent(); return HttpResponse.json({ status: 'PENDING' }); }),
      http.get(`${BASE}/payments/mpesa/bookings/:bookingId/status`, () => mpesa.status())
    );
    renderAt();
    await user.click(await screen.findByRole('button', { name: /send m-pesa prompt/i }));
    expect(await screen.findByText(/cancelled or timed out, the pin was wrong, or the balance was too low/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /use a different number/i }));
    expect(await screen.findByLabelText('M-Pesa phone number')).toHaveValue('+254712345678');
    expect(screen.getByRole('radio', { name: 'M-Pesa' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Try again and a different number prompt again through the retry endpoint, reusing the payment', async () => {
    const user = userEvent.setup();
    const retries = [];
    let checkouts = 0;
    const mpesa = failingPrompts();
    server.use(
      http.post(`${BASE}/payments/mpesa/bookings/:bookingId/checkout`, () => { checkouts += 1; mpesa.sent(); return HttpResponse.json({ status: 'PENDING' }); }),
      http.post(`${BASE}/payments/mpesa/bookings/:bookingId/retry`, ({ request, params }) => {
        mpesa.sent();
        retries.push({ bookingId: params.bookingId, phone: new URL(request.url).searchParams.get('phone') });
        return HttpResponse.json({ status: 'PENDING' });
      }),
      // No M-Pesa payment until the first prompt; every prompt then fails.
      http.get(`${BASE}/payments/mpesa/bookings/:bookingId/status`, () => mpesa.status())
    );
    renderAt();
    await user.click(await screen.findByRole('button', { name: /send m-pesa prompt/i }));
    expect(await screen.findByText(/payment failed/i)).toBeInTheDocument();
    expect(checkouts).toBe(1);
    expect(retries).toEqual([]);

    await user.click(screen.getByRole('button', { name: /^try again$/i }));
    await waitFor(() => expect(retries).toEqual([{ bookingId: 'b1', phone: '254712345678' }]));

    await user.click(await screen.findByRole('button', { name: /use a different number/i }));
    const phone = await screen.findByLabelText('M-Pesa phone number');
    await user.clear(phone);
    await user.type(phone, '0722 000 111');
    await user.click(screen.getByRole('button', { name: /send m-pesa prompt/i }));
    await waitFor(() => expect(retries.at(-1)).toEqual({ bookingId: 'b1', phone: '254722000111' }));
    expect(checkouts).toBe(1);
  });

  it("gives the renter the prompt's minute: the last attempt's FAILED, read right after re-sending, doesn't end the wait", async () => {
    const user = userEvent.setup();
    let polls = 0;
    let paid = false;
    sessionStorage.setItem('checkout:b1', '1');
    sessionStorage.setItem('checkout-provider:b1', 'mpesa');
    sessionStorage.setItem('checkout-phone:b1', '+254712345678');
    sessionStorage.setItem('checkout-prompted-at:b1', String(Date.now() - 61_000));
    server.use(
      http.post(`${BASE}/payments/mpesa/bookings/:bookingId/retry`, () => HttpResponse.json({ status: 'PENDING' })),
      // The payment still reads as the last attempt's FAILED until the renter enters their PIN for this one.
      http.get(`${BASE}/payments/mpesa/bookings/:bookingId/status`, () => {
        polls += 1;
        return HttpResponse.json({ status: paid ? 'SUCCESSFUL' : 'FAILED' });
      })
    );
    renderAt();

    await user.click(await screen.findByRole('button', { name: /^try again$/i }));
    expect(await screen.findByText('Check your phone')).toBeInTheDocument();
    const before = polls;
    await waitFor(() => expect(polls).toBeGreaterThan(before + 1), { timeout: 8000 });
    // Still counting down, still checking — not "Payment failed".
    expect(screen.getByText('Check your phone')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.queryByText(/payment failed/i)).not.toBeInTheDocument();

    paid = true; // the PIN goes in
    expect(await screen.findByText('Payment successful', {}, { timeout: 8000 })).toBeInTheDocument();
  }, 20000);

  it('Try again after the minute ran out sends no second prompt when the first payment landed late', async () => {
    const user = userEvent.setup();
    let prompts = 0;
    let paid = false;
    sessionStorage.setItem('checkout:b1', '1');
    sessionStorage.setItem('checkout-provider:b1', 'mpesa');
    sessionStorage.setItem('checkout-phone:b1', '+254712345678');
    sessionStorage.setItem('checkout-prompted-at:b1', String(Date.now() - 61_000));
    server.use(
      http.get(`${BASE}/payments/mpesa/bookings/:bookingId/status`, () => HttpResponse.json({ status: paid ? 'SUCCESSFUL' : 'PENDING' })),
      http.post(`${BASE}/payments/mpesa/bookings/:bookingId/checkout`, () => { prompts += 1; return HttpResponse.json({ status: 'PENDING' }); })
    );
    renderAt();

    expect(await screen.findByText(/didn.t get the prompt, or it timed out/i)).toBeInTheDocument();
    paid = true; // the PIN went in at the last second; M-Pesa confirms it after the countdown
    await user.click(screen.getByRole('button', { name: /^try again$/i }));

    expect(await screen.findByText('Payment successful')).toBeInTheDocument();
    expect(prompts).toBe(0);
  });

  it('a split still collecting (started in another browser) carries on, rather than offering to start another', async () => {
    server.use(
      http.get(`${BASE}/payments/mpesa/bookings/:bookingId/split`, () => HttpResponse.json({
        splitGroupId: 's1', bookingId: 'b1', groupStatus: 'PARTIAL', totalAmount: 100, totalPaid: 50, totalOutstanding: 50,
        expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
        contributions: [
          { contributionId: 'c1', payerName: 'Ann', payerPhone: '254712345678', amount: 50, status: 'PAID' },
          { contributionId: 'c2', payerName: 'Ben', payerPhone: '254722000111', amount: 50, status: 'PENDING' },
        ],
      }))
    );
    renderAt();

    expect(await screen.findByText('Waiting for the rest to pay')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send m-pesa prompt/i })).not.toBeInTheDocument();
  });
});

describe('PaymentPage — card & other (Pesapal)', () => {
  it("when the checkout can't be started, stays on the choice instead of 'waiting for your payment'", async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/payments/pesapal/bookings/:bookingId/checkout`, () => HttpResponse.json({ message: 'Pesapal is unavailable' }, { status: 502 }))
    );
    renderAt();
    await user.click(await screen.findByRole('radio', { name: 'Card & other' }));
    await user.click(screen.getByRole('button', { name: /proceed to payment/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /proceed to payment/i })).not.toBeDisabled());
    expect(screen.queryByText(/waiting for your payment/i)).not.toBeInTheDocument();
    expect(sessionStorage.getItem('checkout:b1')).toBeNull();
  });
});
