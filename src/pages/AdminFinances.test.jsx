// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import AdminFinancesPage from './AdminFinancesPage';
import BookingFinancialsCard from '../components/admin/BookingFinancialsCard';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderUi(ui) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe('Finances page (Financial Records)', () => {
  it('shows the platform profit and the bookings not yet settled with their owner', async () => {
    server.use(
      http.get(`${BASE}/admin/financials/platform-profit`, () => HttpResponse.json({
        totalSuccessfulPayments: 12, totalCharged: 240000, totalRentalCharged: 230000, totalOverstayCharged: 10000,
        totalCommissionEarned: 24000, totalProcessingCollected: 3000, platformNetProfit: 21000,
        totalOwnerPayoutsPromised: 213000, totalOwnerPayoutsDisbursed: 180000, totalPendingDisbursements: 20000, outstandingOwnerDebt: 33000,
      })),
      http.get(`${BASE}/admin/financials/unsettled`, () => HttpResponse.json([{
        bookingId: 'b1', vehicleTitle: 'Toyota Prado', ownerEmail: 'owner@example.com', renterEmail: 'rita@example.com',
        totalCollectedFromRenter: 20000, totalOwnerPayoutsPromised: 17000, totalOwnerPayoutsDisbursed: 0, totalOwnerPayoutsOutstanding: 17000,
      }]))
    );
    renderUi(<AdminFinancesPage />);

    expect(await screen.findByText('KES 240,000')).toBeInTheDocument();
    expect(screen.getByText('KES 21,000')).toBeInTheDocument();
    expect(screen.getByText('KES 33,000')).toBeInTheDocument();
    const row = (await screen.findByRole('link', { name: 'Toyota Prado' })).closest('tr');
    expect(row).toHaveTextContent('owner@example.com');
    expect(within(row).getAllByText('KES 17,000').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Toyota Prado' })).toHaveAttribute('href', '/admin/bookings/b1');
  });
});

describe("A booking's money (admin booking page)", () => {
  it('lists each charge and its payout, and previews the overstay for a car still out', async () => {
    let askedAt;
    server.use(
      http.get(`${BASE}/admin/financials/bookings/b1`, () => HttpResponse.json({
        bookingId: 'b1', totalBilledToRenter: 20000, totalCollectedFromRenter: 20000, totalPlatformCommission: 2000, totalProcessingFees: 700,
        totalOwnerPayoutsPromised: 17300, totalOwnerPayoutsDisbursed: 0, totalOwnerPayoutsOutstanding: 17300, platformNetProfit: 1300,
        allChargesPaid: true, fullySettled: false,
        charges: [{ paymentId: 'p1', chargeType: 'RENTAL', totalCharged: 20000, charged: true, paymentMethod: 'MPESA', paymentReceipt: 'QWE123', ownerPayoutPromised: 17300, ownerPayoutDisbursed: 0, disbursed: false, disbursementStatus: 'PENDING' }],
      })),
      http.get(`${BASE}/admin/financials/bookings/b1/overstay-preview`, ({ request }) => {
        askedAt = new URL(request.url).searchParams.get('returnAt');
        return HttpResponse.json({ overstayHours: 30, overstayDays: 2, dailyRate: 5000, multiplier: 1.5, baseCharge: 10000, totalCharge: 15000 });
      })
    );
    renderUi(<BookingFinancialsCard booking={{ id: 'b1', status: 'ACTIVE' }} />);

    expect(await screen.findByText('Owner not fully paid')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Charges on this booking' })).toHaveTextContent('Rental');
    expect(screen.getByText(/MPESA · QWE123/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Returned at'), { target: { value: '2026-10-30T12:00' } });
    expect(await screen.findByText('KES 15,000')).toBeInTheDocument();
    expect(screen.getByText(/2 days/)).toHaveTextContent('× 1.5');
    await waitFor(() => expect(askedAt).toBe(new Date('2026-10-30T12:00').toISOString()));
  });

  it('shows nothing when the backend has no record for the booking', async () => {
    const { container } = renderUi(<BookingFinancialsCard booking={{ id: 'b9', status: 'PENDING' }} />);
    await waitFor(() => expect(container.querySelector('[aria-label="Money"]')).toBeNull());
  });
});
