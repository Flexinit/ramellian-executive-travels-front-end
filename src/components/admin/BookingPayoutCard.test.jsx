// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import BookingPayoutCard from './BookingPayoutCard';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});

function renderCard(booking = { id: 'b1', status: 'COMPLETED' }) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Toaster />
      <BookingPayoutCard booking={booking} />
    </QueryClientProvider>
  );
}

describe('BookingPayoutCard', () => {
  it("explains there's no payout until the pickup is recorded (the backend's 404)", async () => {
    server.use(http.get(`${BASE}/admin/disbursements/bookings/b1`, () =>
      HttpResponse.json({ message: 'Disbursement not yet created for this booking — pickup may not have occurred' }, { status: 404 })));
    renderCard();

    expect(await screen.findByText(/no payout yet/i)).toBeInTheDocument();
    expect(screen.getByText(/pickup is recorded/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark paid/i })).not.toBeInTheDocument();
  });

  it('shows a payout waiting to be paid, with Send payout now, Already paid by hand and Failed right here', async () => {
    server.use(http.get(`${BASE}/admin/disbursements/bookings/b1`, () =>
      HttpResponse.json({ id: 'd1', bookingId: 'b1', amount: 9000, status: 'PENDING', ownerName: 'Ann Owner' })));
    renderCard();

    expect(await screen.findByText('To pay')).toBeInTheDocument();
    expect(screen.getByText(/9,000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send payout now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /already paid by hand/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /failed/i })).toBeInTheDocument();
  });

  it('creates a payout by hand when there is none — amount filled in with the owner’s share', async () => {
    const user = userEvent.setup();
    let body;
    let created = false;
    server.use(
      http.get(`${BASE}/admin/disbursements/bookings/b1`, () =>
        created
          ? HttpResponse.json({ id: 'd1', bookingId: 'b1', amount: 8500, status: 'PENDING', ownerPhone: '+254712345678' })
          : HttpResponse.json({ message: 'Disbursement not yet created for this booking' }, { status: 404 })),
      http.post(`${BASE}/admin/disbursements/bookings/b1`, async ({ request }) => {
        body = await request.json();
        created = true;
        return HttpResponse.json({ id: 'd1', bookingId: 'b1', amount: 8500, status: 'PENDING' }, { status: 201 });
      })
    );
    renderCard({ id: 'b1', status: 'COMPLETED', ownerPayout: 8500 });

    await user.click(await screen.findByRole('button', { name: /create payout/i }));
    expect(screen.getByLabelText('Amount (KES)')).toHaveValue(8500);
    await user.type(screen.getByLabelText("Owner's phone (M-Pesa)"), '+254712345678');
    await user.click(screen.getAllByRole('button', { name: /create payout/i }).at(-1));

    await waitFor(() => expect(body).toEqual({ amount: 8500, ownerPhone: '+254712345678' }));
    expect(await screen.findByRole('button', { name: /send payout now/i })).toBeInTheDocument();
  });

  it("offers no Create payout on a booking that wasn't paid", async () => {
    server.use(http.get(`${BASE}/admin/disbursements/bookings/b1`, () => HttpResponse.json({ message: 'none' }, { status: 404 })));
    renderCard({ id: 'b1', status: 'CANCELLED' });
    expect(await screen.findByText(/no payout yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create payout/i })).not.toBeInTheDocument();
  });

  it('edits a payout (e.g. the phone) before sending it', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.get(`${BASE}/admin/disbursements/bookings/b1`, () => HttpResponse.json({ id: 'd1', bookingId: 'b1', amount: 9000, status: 'FAILED', ownerPhone: '+254700000001' })),
      http.patch(`${BASE}/admin/disbursements/d1`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'd1', amount: 9000, status: 'FAILED', ...body });
      })
    );
    renderCard();

    await user.click(await screen.findByRole('button', { name: /^edit$/i }));
    const phone = screen.getByLabelText("Owner's phone (M-Pesa)");
    await user.clear(phone);
    await user.type(phone, '+254712345678');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(body).toMatchObject({ amount: 9000, ownerPhone: '+254712345678' }));
  });

  it('offers Check status for a processing payout', async () => {
    server.use(http.get(`${BASE}/admin/disbursements/bookings/b1`, () =>
      HttpResponse.json({ id: 'd1', bookingId: 'b1', amount: 9000, status: 'PROCESSING', triggeredAt: '2026-10-26T10:00:00Z' })));
    renderCard();

    expect(await screen.findByRole('button', { name: /check status/i })).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
  });
});
