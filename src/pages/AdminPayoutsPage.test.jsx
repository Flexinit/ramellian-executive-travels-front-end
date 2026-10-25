// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    // A processing payout can't be marked paid or failed by hand — only checked.
    expect(screen.queryByRole('button', { name: /mark paid/i })).not.toBeInTheDocument();
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

  it('still marks a pending payout paid with its reference', async () => {
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

    await user.click(await screen.findByRole('button', { name: /mark paid/i }));
    await user.type(screen.getByLabelText('Payment reference'), 'QWE123');
    await user.click(screen.getAllByRole('button', { name: /mark paid/i }).at(-1));

    await waitFor(() => expect(body).toEqual({ reference: 'QWE123' }));
  });
});
