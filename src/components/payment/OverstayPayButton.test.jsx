// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import OverstayPayButton from './OverstayPayButton';
import { PESAPAL_DONE } from '../../lib/pesapalFrame';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderButton(booking = { id: 'b1', overstayAmount: 3000 }) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <OverstayPayButton booking={booking} />
    </QueryClientProvider>
  );
}

const finishInFrame = () =>
  act(() => { window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, data: { type: PESAPAL_DONE } })); });

beforeEach(() => {
  sessionStorage.clear();
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});

describe('Pay overstay', () => {
  it('opens the payment in a dialog; once finished, shows "being confirmed" instead of a second Pay button', async () => {
    const user = userEvent.setup();
    let charges = 0;
    server.use(http.post(`${BASE}/payments/pesapal/bookings/b1/overstay-checkout`, () => {
      charges += 1;
      return HttpResponse.json({ iframeUrl: 'https://pay.pesapal.com/overstay?b=b1' });
    }));
    renderButton();

    await user.click(screen.getByRole('button', { name: /pay overstay kes 3,000/i }));
    await user.click(screen.getByRole('radio', { name: /card & other/i }));
    await user.click(screen.getByRole('button', { name: /continue to pesapal/i }));
    expect(await screen.findByTitle('Pesapal secure payment')).toHaveAttribute('src', 'https://pay.pesapal.com/overstay?b=b1');
    finishInFrame();

    expect(await screen.findByText(/overstay payment being confirmed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pay overstay/i })).not.toBeInTheDocument();
    // A payment that didn't go through can still be paid again — on purpose, not by a stray click.
    await user.click(screen.getByRole('button', { name: /didn.t go through\? pay again/i }));
    await user.click(screen.getByRole('radio', { name: /card & other/i }));
    await user.click(screen.getByRole('button', { name: /continue to pesapal/i }));
    expect(await screen.findByTitle('Pesapal secure payment')).toBeInTheDocument();
    expect(charges).toBe(2);
  });

  it('asks again when the overstay charge has changed since it was paid', () => {
    sessionStorage.setItem('overstay-paid:b1', '3000');
    renderButton({ id: 'b1', overstayAmount: 4500 });
    expect(screen.getByRole('button', { name: /pay overstay kes 4,500/i })).toBeInTheDocument();
  });

  it('pays by M-Pesa prompt to the number given, and says so once the overstay status is SUCCESSFUL', async () => {
    const user = userEvent.setup();
    let phone;
    let checkedOut = false;
    server.use(
      http.post(`${BASE}/payments/mpesa/bookings/b1/overstay/checkout`, ({ request }) => {
        phone = new URL(request.url).searchParams.get('phone');
        checkedOut = true;
        return HttpResponse.json({ status: 'PENDING' });
      }),
      http.get(`${BASE}/payments/mpesa/bookings/b1/overstay/status`, () =>
        checkedOut
          ? HttpResponse.json({ bookingId: 'b1', chargeType: 'OVERSTAY', provider: 'MPESA', status: 'SUCCESSFUL' })
          : HttpResponse.json({ message: 'Payment not found' }, { status: 404 })
      )
    );
    renderButton();

    await user.click(screen.getByRole('button', { name: /pay overstay kes 3,000/i }));
    await user.type(screen.getByLabelText(/m-pesa phone number/i), '0712 345 678');
    await user.click(screen.getByRole('button', { name: /send m-pesa prompt/i }));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Overstay paid')).toBeInTheDocument();
    expect(phone).toBe('254712345678');
  });

  it('refuses a number M-Pesa cannot prompt', async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole('button', { name: /pay overstay kes 3,000/i }));
    await user.type(screen.getByLabelText(/m-pesa phone number/i), '12345');
    await user.click(screen.getByRole('button', { name: /send m-pesa prompt/i }));
    expect(await screen.findByText(/enter a kenyan m-pesa number/i)).toBeInTheDocument();
  });

  it('shows "Overstay paid" when the overstay status says it is, with no Pay button', async () => {
    server.use(http.get(`${BASE}/payments/mpesa/bookings/b1/overstay/status`, () => HttpResponse.json({ status: 'SUCCESSFUL' })));
    renderButton();
    expect(await screen.findByText('Overstay paid')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pay overstay/i })).not.toBeInTheDocument();
  });
});
