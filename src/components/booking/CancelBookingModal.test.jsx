// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import CancelBookingModal from './CancelBookingModal';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;
const HOUR = 60 * 60 * 1000;

function bookingStartingIn(hours) {
  return { id: 'bk-1', startTime: new Date(Date.now() + hours * HOUR).toISOString() };
}

function servePolicy(policy) {
  server.use(http.get(`${BASE}/booking-policies/bookings/:bookingId/effective`, () => HttpResponse.json(policy)));
}

function renderModal(booking, props) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CancelBookingModal isOpen onClose={() => {}} booking={booking} {...props} />
    </QueryClientProvider>
  );
}

describe('CancelBookingModal — cancellation cannot be abused close to pickup', () => {
  it('previews a full refund with plenty of notice', async () => {
    servePolicy({ freeCancellationWindowHours: 24, cancellationDeadlineHours: 6, lateCancellationRefundPct: 50 });
    renderModal(bookingStartingIn(48));

    expect(await screen.findByText(/full refund/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel booking$/i })).toBeInTheDocument();
  });

  it('previews a reduced refund inside the free-cancellation window but outside the deadline', async () => {
    servePolicy({ freeCancellationWindowHours: 24, cancellationDeadlineHours: 6, lateCancellationRefundPct: 40 });
    renderModal(bookingStartingIn(12));

    expect(await screen.findByText(/40% refund/i)).toBeInTheDocument();
  });

  it('refuses the cancellation outright inside the hard deadline, with no confirm button', async () => {
    servePolicy({ freeCancellationWindowHours: 24, cancellationDeadlineHours: 6, lateCancellationRefundPct: 40 });
    renderModal(bookingStartingIn(2));

    expect(await screen.findByText(/too soon to cancel/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cancel booking$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep booking/i })).toBeInTheDocument();
  });

  it('calls the policy-aware cancel endpoint and closes on success', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    servePolicy({ freeCancellationWindowHours: 24, cancellationDeadlineHours: 6, lateCancellationRefundPct: 50 });
    let cancelled = false;
    server.use(
      http.post(`${BASE}/booking-policies/bookings/:bookingId/cancel`, () => {
        cancelled = true;
        return HttpResponse.json({ bookingId: 'bk-1', bookingStatus: 'CANCELLED', refundAmount: 100, refundPercent: 100, message: 'Cancelled.' });
      })
    );
    renderModal(bookingStartingIn(48), { onClose });

    await user.click(await screen.findByRole('button', { name: /^cancel booking$/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(cancelled).toBe(true);
  });

  it('fails open — still offers to cancel if the policy fails to load', async () => {
    server.use(http.get(`${BASE}/booking-policies/bookings/:bookingId/effective`, () => HttpResponse.json({ message: 'nope' }, { status: 500 })));
    renderModal(bookingStartingIn(48));

    expect(await screen.findByRole('button', { name: /^cancel booking$/i })).toBeInTheDocument();
  });
});
