// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import BookingPayoutCard from './BookingPayoutCard';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderCard() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingPayoutCard booking={{ id: 'b1' }} />
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

  it('shows a payout waiting to be paid, with Mark paid and Failed right here', async () => {
    server.use(http.get(`${BASE}/admin/disbursements/bookings/b1`, () =>
      HttpResponse.json({ id: 'd1', bookingId: 'b1', amount: 9000, status: 'PENDING', ownerName: 'Ann Owner' })));
    renderCard();

    expect(await screen.findByText('To pay')).toBeInTheDocument();
    expect(screen.getByText(/9,000/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark paid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /failed/i })).toBeInTheDocument();
  });

  it('offers Check status for a processing payout', async () => {
    server.use(http.get(`${BASE}/admin/disbursements/bookings/b1`, () =>
      HttpResponse.json({ id: 'd1', bookingId: 'b1', amount: 9000, status: 'PROCESSING', triggeredAt: '2026-10-26T10:00:00Z' })));
    renderCard();

    expect(await screen.findByRole('button', { name: /check status/i })).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
  });
});
