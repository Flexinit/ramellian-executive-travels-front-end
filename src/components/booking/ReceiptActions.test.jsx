// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import ReceiptActions from './ReceiptActions';

const BASE = 'http://192.168.8.11:8080/api/v1';

const BOOKING = {
  id: 'b1',
  vehicleId: 'v1',
  vehicleModel: 'Prado',
  renterEmail: 'renter@example.com',
  startTime: '2026-10-01T09:00:00Z',
  endTime: '2026-10-04T09:00:00Z',
};

function renderActions(props = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReceiptActions booking={BOOKING} {...props} />
    </QueryClientProvider>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReceiptActions', () => {
  it('renders nothing for a booking with no successful payment (the default: 404 "Payment not found")', async () => {
    const { container } = renderActions();
    // Let the one-shot query settle before asserting there's genuinely nothing, not just "not yet loaded".
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/receipt/i)).not.toBeInTheDocument();
  });

  it('skips the lookup entirely when `enabled` is false, rather than firing a doomed request', async () => {
    let called = false;
    server.use(
      http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () => {
        called = true;
        return HttpResponse.json({ status: 404 }, { status: 404 });
      })
    );
    renderActions({ enabled: false });
    await new Promise((r) => setTimeout(r, 0));
    expect(called).toBe(false);
  });

  it('offers Preview and Download once a successful payment is found, and Preview shows the receipt with no fee breakdown', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () =>
        HttpResponse.json({
          paymentId: 'p1',
          bookingId: 'b1',
          provider: 'PESAPAL',
          status: 'SUCCESSFUL',
          amount: 3.06,
          platformFee: 0.06,
          transactionFee: 0.01,
          ownerPayout: 3.0,
          orderTrackingId: 'track-1',
          receipt: 'RCPT-001',
        })
      )
    );
    renderActions();

    const previewButton = await screen.findByRole('button', { name: /^receipt$/i });
    await user.click(previewButton);

    expect(await screen.findByRole('dialog', { name: /receipt/i })).toBeInTheDocument();
    expect(screen.getByText('b1')).toBeInTheDocument();
    expect(screen.getByText('RCPT-001')).toBeInTheDocument();
    // Amount Paid is the only dollar figure shown — never the fee breakdown (the whole point of item 29).
    expect(screen.getByText('KES 3.06')).toBeInTheDocument();
    expect(screen.queryByText(/0\.06/)).not.toBeInTheDocument();
    expect(screen.queryByText(/platform fee/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/transaction fee/i)).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: /download receipt/i })).toBeInTheDocument();
  });

  it("prefers the booking's own estimatedAmount over PaymentStatusResponse.amount — a renter reported paying more than the receipt showed (2026-10-06)", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () =>
        // `amount` here looks to be the bare baseAmount (per docs/backend-requests.md item 29) — understating
        // what Pesapal actually collected, which the booking's own estimatedAmount already got right.
        HttpResponse.json({ status: 'SUCCESSFUL', amount: 2, transactionFee: 1, orderTrackingId: 't2' })
      )
    );
    renderActions({ booking: { ...BOOKING, estimatedAmount: 3 } });

    await user.click(await screen.findByRole('button', { name: /^receipt$/i }));

    expect(await screen.findByText('KES 3')).toBeInTheDocument();
    expect(screen.queryByText('KES 2')).not.toBeInTheDocument();
  });

  it('Download opens the receipt and triggers the print dialog straight away; Preview does not', async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    server.use(
      http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () =>
        HttpResponse.json({ status: 'SUCCESSFUL', amount: 100, orderTrackingId: 't1' })
      )
    );
    renderActions();

    await user.click(await screen.findByRole('button', { name: /download receipt/i }));
    expect(await screen.findByRole('dialog', { name: /receipt/i })).toBeInTheDocument();
    await vi.waitFor(() => expect(printSpy).toHaveBeenCalledTimes(1));
  });
});
