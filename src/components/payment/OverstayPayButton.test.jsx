// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
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
    expect(await screen.findByTitle('Pesapal secure payment')).toHaveAttribute('src', 'https://pay.pesapal.com/overstay?b=b1');
    finishInFrame();

    expect(await screen.findByText(/overstay payment being confirmed/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pay overstay/i })).not.toBeInTheDocument();
    // A payment that didn't go through can still be paid again — on purpose, not by a stray click.
    await user.click(screen.getByRole('button', { name: /didn.t go through\? pay again/i }));
    expect(await screen.findByTitle('Pesapal secure payment')).toBeInTheDocument();
    expect(charges).toBe(2);
  });

  it('asks again when the overstay charge has changed since it was paid', () => {
    sessionStorage.setItem('overstay-paid:b1', '3000');
    renderButton({ id: 'b1', overstayAmount: 4500 });
    expect(screen.getByRole('button', { name: /pay overstay kes 4,500/i })).toBeInTheDocument();
  });
});
