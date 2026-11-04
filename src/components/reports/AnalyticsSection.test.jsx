// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import AnalyticsSection from './AnalyticsSection';
import { ratePercent } from '../../hooks/useAnalytics';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderUi() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AnalyticsSection />
    </QueryClientProvider>
  );
}

describe('AnalyticsSection (analytics-controller)', () => {
  it('shows the summary with growth, the booking rates and the top vehicles and owners for the last 30 days', async () => {
    const asked = [];
    server.use(
      http.get(`${BASE}/admin/analytics/summary`, ({ request }) => {
        asked.push(Object.fromEntries(new URL(request.url).searchParams));
        return HttpResponse.json({
          grossRevenue: 125000.4, platformEarnings: 18750, ownerPayoutsEarned: 100000, totalBookings: 42, avgBookingValue: 2976.2,
          revenueGrowthPct: 12.5, earningsGrowthPct: -3.4, bookingGrowthPct: 0, successfulPayments: 40, pendingPayments: 1, failedPayments: 2,
          totalDisbursed: 60000, pendingDisbursements: 40000, transactionFees: 3500, deliveryFees: 2000, driverCharges: 4500,
        });
      }),
      http.get(`${BASE}/admin/analytics/bookings`, () => HttpResponse.json({
        totalBookings: 42, confirmationRate: 0.8, cancellationRate: 0.1, countByStatus: { COMPLETED: 30, CANCELLED: 4, PENDING: 0 },
      })),
      http.get(`${BASE}/admin/analytics/vehicles/top`, () => HttpResponse.json([
        { vehicleId: 'v1', model: 'Toyota Prado', registrationNumber: 'KDA 123A', bookingCount: 12, grossRevenue: 60000, platformEarnings: 9000 },
      ])),
      http.get(`${BASE}/admin/analytics/owners/top`, () => HttpResponse.json([
        { ownerId: 'o1', name: 'Ann Owner', email: 'ann@example.com', vehicleCount: 3, bookingCount: 20, grossRevenue: 80000, ownerPayouts: 68000 },
      ]))
    );
    renderUi();

    expect(await screen.findByText('KES 125,000')).toBeInTheDocument();
    expect(screen.getByText('+12.5% vs previous period')).toBeInTheDocument();
    expect(screen.getByText('-3.4% vs previous period')).toBeInTheDocument();
    expect(await screen.findByText('80%')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    // Statuses with no bookings are left out.
    expect(within(screen.getByRole('list', { name: 'Bookings by status' })).getAllByRole('listitem')).toHaveLength(2);
    expect(await screen.findByText('Toyota Prado')).toBeInTheDocument();
    expect(screen.getByText('Ann Owner')).toBeInTheDocument();
    expect(screen.getByText('KES 68,000')).toBeInTheDocument();

    // The last 30 days, today included.
    const { from, to } = asked[0];
    expect((new Date(to) - new Date(from)) / 86_400_000).toBe(29);
  });

  it('asks again for the period chosen', async () => {
    const user = userEvent.setup();
    const asked = [];
    server.use(http.get(`${BASE}/admin/analytics/earnings/daily`, ({ request }) => {
      asked.push(Object.fromEntries(new URL(request.url).searchParams));
      return HttpResponse.json([]);
    }));
    renderUi();
    await waitFor(() => expect(asked).toHaveLength(1));

    await user.click(screen.getByRole('radio', { name: '7 days' }));
    await waitFor(() => expect(asked).toHaveLength(2));
    expect((new Date(asked[1].to) - new Date(asked[1].from)) / 86_400_000).toBe(6);
  });

  it('shows each day in a table view too', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/admin/analytics/earnings/daily`, () => HttpResponse.json([
      { date: '2026-10-20', grossRevenue: 10000, platformEarnings: 1500, ownerPayouts: 8500, paymentCount: 2 },
    ])));
    renderUi();
    await user.click(await screen.findByRole('button', { name: 'Table view' }));
    const row = await screen.findByRole('row', { name: /20 Oct/ });
    expect(row).toHaveTextContent('KES 10,000');
    expect(row).toHaveTextContent('KES 8,500');
  });

  it('reads a rate of at most 1 as a fraction', () => {
    expect(ratePercent(0.25)).toBe(25);
    expect(ratePercent(25)).toBe(25);
    expect(ratePercent(null)).toBeNull();
  });
});
