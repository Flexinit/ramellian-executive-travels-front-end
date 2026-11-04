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
    server.use(
      http.post(`${BASE}/payments/mpesa/bookings/:bookingId/checkout`, () => HttpResponse.json({ status: 'PENDING' })),
      http.get(`${BASE}/payments/mpesa/bookings/:bookingId/status`, () => HttpResponse.json({ status: 'FAILED' }))
    );
    renderAt();
    await user.click(await screen.findByRole('button', { name: /send m-pesa prompt/i }));
    expect(await screen.findByText(/payment failed/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /choose another way to pay/i }));
    expect(await screen.findByRole('radio', { name: 'Card & other' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /proceed to payment/i })).toBeInTheDocument();
  });
});
