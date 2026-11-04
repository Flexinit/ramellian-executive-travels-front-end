// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import AdminBookingTransactionPage from './AdminBookingTransactionPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderAt() {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/admin/bookings/b1/transaction']}>
          <Routes>
            <Route path="/admin/bookings/:bookingId/transaction" element={<AdminBookingTransactionPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('Transaction breakdown — the whole of a booking\'s money, worked through', () => {
  it('builds each charge, splits it, checks every figure against how it is worked out, and reconciles the booking', async () => {
    server.use(
      http.get(`${BASE}/admin/financials/bookings/b1`, () => HttpResponse.json({
        bookingId: 'b1', vehicleTitle: 'Toyota Prado', renterEmail: 'rita@example.com', ownerEmail: 'owner@example.com', bookingStatus: 'COMPLETED',
        totalBilledToRenter: 16560, totalCollectedFromRenter: 16560, totalPlatformCommission: 1500, totalProcessingFees: 560,
        totalOwnerPayoutsPromised: 13500, totalOwnerPayoutsDisbursed: 13500, totalOwnerPayoutsOutstanding: 0, platformNetProfit: 3060, fullySettled: true,
        charges: [{
          paymentId: 'p1', chargeType: 'RENTAL', baseAmount: 15000, deliveryFee: 1000, processingFee: 560, totalCharged: 16560,
          platformCommission: 1500, ownerPayoutPromised: 13500, ownerPayoutDisbursed: 13500, ownerPayoutShortfall: 0,
          charged: true, disbursed: true, paymentMethod: 'PESAPAL', paymentReceipt: 'R-77', disbursementReference: 'B2C-1',
        }],
      })),
      http.get(`${BASE}/bookings/b1`, () => HttpResponse.json({ id: 'b1', vehicleId: 'v1', numberOfDays: 3, status: 'COMPLETED' })),
      http.get(`${BASE}/vehicles/v1`, () => HttpResponse.json({ id: 'v1', dailyPrice: 5000 })),
      http.get(`${BASE}/platform-settings`, () => HttpResponse.json({ commissionRatePct: 2, multiDayCommissionRatePct: 10, multiDayThresholdDays: 2, pesapalTransactionFeeRatePct: 3.5 }))
    );
    renderAt();

    expect(await screen.findByRole('heading', { name: 'Transaction breakdown' })).toBeInTheDocument();
    expect(screen.getByText('Fully settled')).toBeInTheDocument();

    // 1. Built line by line, with the rental's own working.
    const built = screen.getByRole('table', { name: 'How charge 1 was built' });
    expect(await within(built).findByText(/KES 5,000 a day × 3 days = KES 15,000/)).toBeInTheDocument();
    expect(within(built).getByText('Pesapal 3.5% of 16,000')).toBeInTheDocument();
    expect(screen.getByText('KES 16,560 — adds up')).toBeInTheDocument();

    // 2. Where it went — every part named with its amount and share.
    const split = screen.getByRole('table', { name: "Where charge 1's money went" });
    expect(within(split).getByText("Owner's share").closest('tr')).toHaveTextContent('KES 13,500');
    expect(within(split).getByText('Platform commission').closest('tr')).toHaveTextContent('9.1%');

    // 3. Each figure checked: the longer-booking 10% rate applies to 3 days.
    const checks = screen.getByRole('table', { name: 'Checks on charge 1' });
    await within(checks).findByText(/10% of KES 15,000/);
    expect(within(checks).getAllByText('Matches')).toHaveLength(3);

    // The whole booking reconciles with the recorded net profit.
    const whole = screen.getByRole('table', { name: 'The booking reconciled' });
    expect(within(whole).getByText('= The platform keeps').closest('tr')).toHaveTextContent('KES 3,060');
    expect(screen.getByText('What the platform keeps matches the recorded net profit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download csv/i })).toBeInTheDocument();
  });

  it('flags a figure that does not add up, saying by how much', async () => {
    server.use(
      http.get(`${BASE}/admin/financials/bookings/b1`, () => HttpResponse.json({
        bookingId: 'b1', totalCollectedFromRenter: 10000, totalOwnerPayoutsPromised: 9500,
        charges: [{ paymentId: 'p1', chargeType: 'RENTAL', baseAmount: 10000, totalCharged: 10000, platformCommission: 1000, ownerPayoutPromised: 9500 }],
      })),
      http.get(`${BASE}/bookings/b1`, () => HttpResponse.json({ id: 'b1', vehicleId: 'v1', numberOfDays: 1 })),
      http.get(`${BASE}/platform-settings`, () => HttpResponse.json({ commissionRatePct: 10 }))
    );
    renderAt();

    const checks = await screen.findByRole('table', { name: 'Checks on charge 1' });
    expect(within(checks).getByText("Owner's share").closest('tr')).toHaveTextContent('Off by KES 500');
    expect(screen.getByText(/KES 500 more is paid out than was charged/)).toBeInTheDocument();
  });
});
