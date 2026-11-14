// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import PayoutNotice from './PayoutNotice';
import PayoutSendProgress from './PayoutSendProgress';
import { postPayoutNotice, startPayoutWatch } from '../../hooks/usePayoutNotice';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

const PAYOUT = (over) => ({ id: 'd1', bookingId: 'b1', ownerName: 'Ann Owner', amount: 9000, status: 'PROCESSING', ...over });

function setup({ open = true, sentAgo = 0, payouts = [PAYOUT()] } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  startPayoutWatch(client, payouts);
  if (sentAgo) client.setQueryData(['payout-notice'], (n) => ({ ...n, watch: { ...n.watch, startedAt: Date.now() - sentAgo } }));
  render(
    <QueryClientProvider client={client}>
      <PayoutNotice />
      <PayoutSendProgress isOpen={open} onClose={() => {}} />
    </QueryClientProvider>
  );
  return client;
}

describe('PayoutNotice — waiting for Safaricom', () => {
  it('shows a visible 60-second countdown, in the dialog and in the banner, re-reading the payout without sending it again', async () => {
    let reads = 0;
    let triggered = false;
    server.use(
      http.get(`${BASE}/admin/disbursements/bookings/b1`, () => { reads += 1; return HttpResponse.json(PAYOUT()); }),
      http.post(`${BASE}/admin/disbursements/d1/trigger`, () => { triggered = true; return HttpResponse.json(PAYOUT()); })
    );
    setup();

    const dialog = screen.getByRole('dialog', { name: 'Waiting for Safaricom' });
    expect(within(dialog).getByRole('timer')).toHaveAccessibleName(/^(60|59) seconds left for Safaricom to confirm the payout$/);
    // The banner keeps its own countdown once the dialog is closed, and can't be dismissed while it runs.
    const banner = screen.getAllByRole('status').find((el) => el.textContent.includes("Don't send it again"));
    expect(within(banner).getByRole('timer')).toBeInTheDocument();
    expect(within(banner).queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
    expect(banner).toHaveTextContent('KES 9,000 to Ann Owner');
    await waitFor(() => expect(reads).toBeGreaterThan(0));
    expect(triggered).toBe(false);
  });

  it('says Paid, with the M-Pesa ref, as soon as Safaricom confirms, and it stays until dismissed', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/admin/disbursements/bookings/b1`, () =>
      HttpResponse.json(PAYOUT({ status: 'COMPLETED', reference: 'SGH7XK2ABC' }))));
    setup({ open: false });

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Payout paid'));
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('M-Pesa ref SGH7XK2ABC.');
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();

    await user.click(within(banner).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says it failed, and what to do, as an alert', async () => {
    server.use(http.get(`${BASE}/admin/disbursements/bookings/b1`, () =>
      HttpResponse.json(PAYOUT({ status: 'FAILED', notes: 'Invalid phone number' }))));
    setup({ open: false });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Payout failed');
    expect(alert).toHaveTextContent('Invalid phone number');
  });

  it('checks once more with POST .../sync when the minute is up, then says it is still processing', async () => {
    let synced = false;
    server.use(
      http.get(`${BASE}/admin/disbursements/bookings/b1`, () => HttpResponse.json(PAYOUT())),
      http.post(`${BASE}/admin/disbursements/d1/sync`, () => { synced = true; return HttpResponse.json(PAYOUT()); })
    );
    setup({ sentAgo: 61_000 });

    await waitFor(() => expect(synced).toBe(true));
    expect(await screen.findByRole('dialog', { name: 'Still processing' })).toBeInTheDocument();
    expect(screen.getAllByText(/hasn't confirmed it within a minute/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/the owner could be paid twice/i).length).toBeGreaterThan(0);
  });

  it('sums up a batch: how many paid, failed and still processing', async () => {
    const two = PAYOUT({ id: 'd2', bookingId: 'b2', ownerName: 'Ben Owner' });
    server.use(
      http.get(`${BASE}/admin/disbursements/bookings/b1`, () => HttpResponse.json(PAYOUT({ status: 'COMPLETED' }))),
      http.get(`${BASE}/admin/disbursements/bookings/b2`, () => HttpResponse.json({ ...two, status: 'FAILED' }))
    );
    setup({ open: false, payouts: [PAYOUT(), two] });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('1 paid, 1 failed');
    expect(alert).toHaveTextContent('Failed: Ben Owner');
  });

  it("shows only that booking's news on a booking page", () => {
    const client = new QueryClient();
    postPayoutNotice(client, { payout: PAYOUT({ status: 'COMPLETED' }), tone: 'success', title: 'Payout paid' });
    render(
      <QueryClientProvider client={client}>
        <PayoutNotice bookingId="other-booking" />
      </QueryClientProvider>
    );
    expect(screen.queryByText('Payout paid')).not.toBeInTheDocument();
  });
});
