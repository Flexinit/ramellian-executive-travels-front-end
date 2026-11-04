import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';

/**
 * Financial records, admin only — "Financial Records" (live spec 2026-10-27): where every shilling of a booking went.
 *
 *  - `GET /admin/financials/platform-profit` → `PlatformProfitSummary` (charged, commission, fees, owner payouts promised
 *    / paid / pending, outstanding owner debt, net profit)
 *  - `GET /admin/financials/unsettled` → `BookingFinancialSummary[]` — bookings paid for (at least partly) whose owner
 *    isn't fully paid yet
 *  - `GET /admin/financials/bookings/{bookingId}` → `BookingFinancialSummary` — every charge on a booking (rental,
 *    overstay…) and the payout against each
 *  - `GET /admin/financials/bookings/{bookingId}/overstay-preview?returnAt=` → `OverstaySummary` — what a late return at
 *    that time would cost
 */

const KEY = ['admin', 'financials'];

export function usePlatformProfit() {
  return useQuery({ queryKey: [...KEY, 'profit'], queryFn: () => apiGet('/admin/financials/platform-profit') });
}

export function useUnsettledBookings() {
  return useQuery({ queryKey: [...KEY, 'unsettled'], queryFn: () => apiGet('/admin/financials/unsettled') });
}

/** A booking's money, charge by charge — `null` when the backend has nothing for it (404). */
export function useBookingFinancials(bookingId, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...KEY, 'booking', bookingId],
    queryFn: async () => {
      try {
        return await apiGet(`/admin/financials/bookings/${bookingId}`);
      } catch (error) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!bookingId && enabled,
    retry: false,
  });
}

/** What a return at `returnAt` (an ISO date-time) would cost in overstay; only asks once a time is given. */
export function useOverstayPreview(bookingId, returnAt) {
  return useQuery({
    queryKey: [...KEY, 'overstay', bookingId, returnAt],
    queryFn: () => apiGet(`/admin/financials/bookings/${bookingId}/overstay-preview`, { returnAt }),
    enabled: !!bookingId && !!returnAt,
    retry: false,
  });
}

/** The charge types the backend names, in words. */
export const CHARGE_LABEL = { RENTAL: 'Rental', OVERSTAY: 'Overstay', DELIVERY: 'Delivery', DRIVER: 'Driver' };
