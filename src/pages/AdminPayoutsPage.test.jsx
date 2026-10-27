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
import AdminPayoutsPage from './AdminPayoutsPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

const PAYOUT = (over) => ({
  id: 'd1', bookingId: 'b1', vehicleTitle: 'Toyota Prado', ownerName: 'Ann Owner', ownerEmail: 'ann@example.com',
  amount: 9000, status: 'PENDING', createdAt: '2026-10-26T09:00:00Z', ...over,
});

function renderUi() {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <Toaster />
        <MemoryRouter initialEntries={['/admin/payouts']}>
          <AdminPayoutsPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
});

describe('AdminPayoutsPage', () => {
  it('has a Processing tab, asking for PROCESSING payouts', async () => {
    const user = userEvent.setup();
    const asked = [];
    server.use(http.get(`${BASE}/admin/disbursements`, ({ request }) => {
      const status = new URL(request.url).searchParams.get('status');
      asked.push(status);
      return HttpResponse.json(status === 'PROCESSING' ? [PAYOUT({ status: 'PROCESSING', triggeredAt: '2026-10-26T10:00:00Z' })] : []);
    }));
    renderUi();

    await user.click(await screen.findByRole('radio', { name: 'Processing' }));
    expect(await screen.findByText('Toyota Prado')).toBeInTheDocument();
    expect(asked).toContain('PROCESSING');
    // Sent, not paid, while the provider hasn't confirmed it.
    expect(screen.getByText(/· sent /)).toBeInTheDocument();
    // A processing payout can't be sent or marked by hand — only checked.
    expect(screen.queryByRole('button', { name: /send payout now|already paid by hand/i })).not.toBeInTheDocument();
  });

  it("checks a processing payout's status with POST /admin/disbursements/{id}/sync", async () => {
    const user = userEvent.setup();
    let synced = false;
    server.use(
      http.get(`${BASE}/admin/disbursements`, ({ request }) =>
        HttpResponse.json(new URL(request.url).searchParams.get('status') === 'PROCESSING' && !synced ? [PAYOUT({ status: 'PROCESSING' })] : [])),
      http.post(`${BASE}/admin/disbursements/d1/sync`, () => {
        synced = true;
        return HttpResponse.json(PAYOUT({ status: 'COMPLETED', reference: 'QWE123' }));
      })
    );
    renderUi();

    await user.click(await screen.findByRole('radio', { name: 'Processing' }));
    await user.click(await screen.findByRole('button', { name: /check status/i }));

    expect(await screen.findByText('Payout status: paid.')).toBeInTheDocument();
    await waitFor(() => expect(synced).toBe(true));
    await waitFor(() => expect(screen.queryByText('Toyota Prado')).not.toBeInTheDocument());
  });

  it('records a payout already paid by hand — the reference is required', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.get(`${BASE}/admin/disbursements`, () => HttpResponse.json([PAYOUT()])),
      http.post(`${BASE}/admin/disbursements/d1/trigger`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(PAYOUT({ status: 'COMPLETED' }));
      })
    );
    renderUi();

    await user.click(await screen.findByRole('button', { name: /already paid by hand/i }));
    const record = screen.getByRole('button', { name: /record payment/i });
    expect(record).toBeDisabled();
    await user.type(screen.getByLabelText('Payment reference'), 'QWE123');
    await user.click(record);

    await waitFor(() => expect(body).toEqual({ reference: 'QWE123' }));
  });

  it('sends a payout through the provider after confirming — no reference', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.get(`${BASE}/admin/disbursements`, () => HttpResponse.json([PAYOUT()])),
      http.post(`${BASE}/admin/disbursements/d1/trigger`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(PAYOUT({ status: 'PROCESSING' }));
      })
    );
    renderUi();

    await user.click(await screen.findByRole('button', { name: /send payout now/i }));
    expect(screen.getByText(/through the payment provider now/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^send kes/i }));

    await waitFor(() => expect(body).toEqual({}));
    expect(await screen.findByText(/payout sent — it shows as processing/i)).toBeInTheDocument();
  });

  it('offers Try again on a failed payout', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/admin/disbursements`, ({ request }) =>
      HttpResponse.json(new URL(request.url).searchParams.get('status') === 'FAILED' ? [PAYOUT({ status: 'FAILED', notes: 'Provider timeout' })] : [])));
    renderUi();

    await user.click(await screen.findByRole('radio', { name: 'Failed' }));
    expect(await screen.findByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /already paid by hand/i })).toBeInTheDocument();
  });

  it('creates a payout from this page for a paid booking that has none', async () => {
    const user = userEvent.setup();
    let posted;
    const booking = (id, status, vehicleModel) => ({
      id, status, vehicleModel, startTime: '2026-10-01T09:00:00+03:00', endTime: '2026-10-04T09:00:00+03:00', renterEmail: 'rita@example.com',
    });
    server.use(
      // b1 already has a payout; b3 was cancelled, so neither can be picked.
      http.get(`${BASE}/admin/disbursements`, ({ request }) =>
        HttpResponse.json(new URL(request.url).searchParams.get('status') === 'COMPLETED' ? [PAYOUT({ status: 'COMPLETED' })] : [])),
      http.get(`${BASE}/bookings/reports/admin`, () => HttpResponse.json({
        completed: [booking('b1', 'COMPLETED', 'Toyota Prado'), booking('b2', 'COMPLETED', 'Mazda CX-5')],
        cancelled: [booking('b3', 'CANCELLED', 'Subaru Forester')],
      })),
      http.post(`${BASE}/admin/disbursements/bookings/:bookingId`, async ({ request, params }) => {
        posted = { bookingId: params.bookingId, body: await request.json() };
        return HttpResponse.json(PAYOUT({ id: 'd2', bookingId: params.bookingId }), { status: 201 });
      })
    );
    renderUi();

    await user.click((await screen.findAllByRole('button', { name: /create payout/i }))[0]);
    const picker = screen.getByLabelText('Booking');
    await waitFor(() => expect(picker).toBeEnabled());
    const choices = Array.from(picker.options).map((o) => o.textContent);
    expect(choices.some((c) => c.includes('Mazda CX-5'))).toBe(true);
    expect(choices.some((c) => c.includes('Toyota Prado') || c.includes('Subaru Forester'))).toBe(false);

    // A booking must be chosen first.
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^create payout$/i }));
    expect(await screen.findByText('Choose the booking this payout is for.')).toBeInTheDocument();
    expect(posted).toBeUndefined();

    await user.selectOptions(picker, 'b2');
    await user.type(screen.getByLabelText(/owner's phone/i), '+254712345678');
    await user.click(within(dialog).getByRole('button', { name: /^create payout$/i }));

    await waitFor(() => expect(posted).toEqual({ bookingId: 'b2', body: { ownerPhone: '+254712345678' } }));
    expect(await screen.findByText(/payout created/i)).toBeInTheDocument();
  });

  it('sends several payouts at once — one trigger each, and says which one failed', async () => {
    const user = userEvent.setup();
    const triggered = [];
    server.use(
      http.get(`${BASE}/admin/disbursements`, ({ request }) =>
        HttpResponse.json(new URL(request.url).searchParams.get('status') === 'PENDING'
          ? [PAYOUT(), PAYOUT({ id: 'd2', ownerName: 'Ben Owner', amount: 5000 }), PAYOUT({ id: 'd3', ownerName: 'Cy Owner', amount: 1000 })]
          : [])),
      http.post(`${BASE}/admin/disbursements/:id/trigger`, async ({ params, request }) => {
        triggered.push({ id: params.id, body: await request.json() });
        if (params.id === 'd2') return HttpResponse.json({ message: 'Owner phone number is missing' }, { status: 400 });
        return HttpResponse.json(PAYOUT({ id: params.id, status: 'PROCESSING' }));
      })
    );
    renderUi();

    await user.click(await screen.findByLabelText('Select the payout to Ann Owner'));
    await user.click(screen.getByLabelText('Select the payout to Ben Owner'));
    expect(screen.getByText(/selected/)).toHaveTextContent('2 selected · KES 14,000');

    await user.click(screen.getByRole('button', { name: /^send 2$/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/through the payment provider now/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /^send kes/i }));

    expect(await within(dialog).findByText(/1 sent/)).toBeInTheDocument();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Ben Owner');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Owner phone number is missing');
    expect(triggered).toEqual([{ id: 'd1', body: {} }, { id: 'd2', body: {} }]);
  });

  it('records several payouts as paid by hand with one shared reference', async () => {
    const user = userEvent.setup();
    const triggered = [];
    server.use(
      http.get(`${BASE}/admin/disbursements`, ({ request }) =>
        HttpResponse.json(new URL(request.url).searchParams.get('status') === 'PENDING'
          ? [PAYOUT(), PAYOUT({ id: 'd2', ownerName: 'Ben Owner' })]
          : [])),
      http.post(`${BASE}/admin/disbursements/:id/trigger`, async ({ params, request }) => {
        triggered.push({ id: params.id, body: await request.json() });
        return HttpResponse.json(PAYOUT({ id: params.id, status: 'COMPLETED' }));
      })
    );
    renderUi();

    await user.click(await screen.findByLabelText(/select all/i));
    await user.click(screen.getByRole('button', { name: /mark 2 paid by hand/i }));
    const dialog = screen.getByRole('dialog');
    const record = within(dialog).getByRole('button', { name: /record 2 paid/i });
    expect(record).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Payment reference'), 'BULK-77');
    await user.click(record);

    expect(await within(dialog).findByText('2 recorded as paid.')).toBeInTheDocument();
    expect(triggered).toEqual([{ id: 'd1', body: { reference: 'BULK-77' } }, { id: 'd2', body: { reference: 'BULK-77' } }]);
  });

  it('has no batch selection on Paid', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/admin/disbursements`, () => HttpResponse.json([PAYOUT({ status: 'COMPLETED' })])));
    renderUi();
    await user.click(await screen.findByRole('radio', { name: 'Paid' }));
    await screen.findByText('Toyota Prado');
    expect(screen.queryByLabelText(/select all/i)).not.toBeInTheDocument();
  });
});
