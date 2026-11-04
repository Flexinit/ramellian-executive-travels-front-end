// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import AdminRefundsPage from './AdminRefundsPage';
import BookingRefundCard from '../components/admin/BookingRefundCard';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;
const REFUND = (over) => ({
  id: 'r1', bookingId: 'b1', vehicleTitle: 'Toyota Prado', amount: 5000, reason: 'Owner cancelled', status: 'PENDING',
  initiatedBy: 'admin@example.com', createdAt: '2026-10-27T09:00:00Z', ...over,
});

function renderUi(ui) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <Toaster />
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});

describe('Refunds page (GET /admin/refunds)', () => {
  it('lists refunds by status, and marks an open one refunded after confirming', async () => {
    const user = userEvent.setup();
    const asked = [];
    let completed = false;
    server.use(
      http.get(`${BASE}/admin/refunds`, ({ request }) => {
        const status = new URL(request.url).searchParams.get('status');
        asked.push(status);
        return HttpResponse.json(status === 'PENDING' && !completed ? [REFUND()] : []);
      }),
      http.post(`${BASE}/admin/refunds/r1/complete`, () => {
        completed = true;
        return HttpResponse.json(REFUND({ status: 'COMPLETED' }));
      })
    );
    renderUi(<AdminRefundsPage />);

    expect(await screen.findByText('Toyota Prado')).toBeInTheDocument();
    expect(screen.getByText('Owner cancelled')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /mark refunded/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /mark refunded/i }));

    await waitFor(() => expect(completed).toBe(true));
    expect(await screen.findByText('Refund marked as refunded.')).toBeInTheDocument();
    expect(asked[0]).toBe('PENDING');
  });
});

describe("A booking's refund (admin booking page)", () => {
  it('starts a refund through Pesapal — a reason is required, and no more than was paid', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.get(`${BASE}/admin/refunds/booking/b1`, () => (body ? HttpResponse.json(REFUND({ amount: 3000 })) : HttpResponse.json({ message: 'Not found' }, { status: 404 }))),
      http.get(`${BASE}/payments/pesapal/bookings/b1/status`, () => HttpResponse.json({ status: 'SUCCESSFUL', amount: 8000 })),
      http.post(`${BASE}/admin/refunds/booking/b1`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(REFUND({ amount: 3000 }), { status: 201 });
      })
    );
    renderUi(<BookingRefundCard booking={{ id: 'b1', status: 'CANCELLED' }} />);

    await user.click(await screen.findByRole('button', { name: /refund payment/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Amount (KES)'), '9000');
    await user.click(within(dialog).getByRole('button', { name: /start refund/i }));
    expect(within(dialog).getByText(/can't be more than was paid \(KES 8,000\)/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/say why/i)).toBeInTheDocument();
    expect(body).toBeUndefined();

    await user.clear(within(dialog).getByLabelText('Amount (KES)'));
    await user.type(within(dialog).getByLabelText('Amount (KES)'), '3000');
    await user.type(within(dialog).getByLabelText('Reason'), 'Owner cancelled');
    await user.click(within(dialog).getByRole('button', { name: /start refund/i }));

    await waitFor(() => expect(body).toEqual({ amount: 3000, reason: 'Owner cancelled' }));
    expect(await screen.findByText('KES 3,000')).toBeInTheDocument();
  });

  it('shows nothing for a booking that was never paid for', async () => {
    server.use(
      http.get(`${BASE}/admin/refunds/booking/b2`, () => HttpResponse.json({ message: 'Not found' }, { status: 404 })),
      http.get(`${BASE}/payments/pesapal/bookings/b2/status`, () => HttpResponse.json({ message: 'Payment not found' }, { status: 404 }))
    );
    const { container } = renderUi(<BookingRefundCard booking={{ id: 'b2', status: 'PENDING' }} />);
    await waitFor(() => expect(container.querySelector('[aria-label="Refund"]')).toBeNull());
    expect(screen.queryByRole('button', { name: /refund payment/i })).not.toBeInTheDocument();
  });
});
