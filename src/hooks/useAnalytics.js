import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';

/**
 * Platform analytics, admin only — `analytics-controller` (live spec 2026-10-27). Every endpoint takes an optional
 * date range, `from` / `to` (`yyyy-MM-dd`, inclusive); left out, the backend picks its own default.
 *
 *  - `GET /admin/analytics/summary` → `PlatformSummaryResponse` (revenue, earnings, payouts, fees, payments, bookings,
 *    and growth against the previous period of the same length)
 *  - `GET /admin/analytics/earnings/daily` → `DailyEarningResponse[]`
 *  - `GET /admin/analytics/bookings` → `BookingAnalyticsResponse` (counts by status, cancellation/confirmation rates)
 *  - `GET /admin/analytics/vehicles/top?limit=` → `TopVehicleResponse[]`
 *  - `GET /admin/analytics/owners/top?limit=` → `TopOwnerResponse[]`
 *
 * @typedef {{ from?: string, to?: string }} DateRange
 */

const KEY = ['admin', 'analytics'];
const params = ({ from, to } = {}, extra = {}) => ({ ...(from ? { from } : {}), ...(to ? { to } : {}), ...extra });

/** @param {DateRange} range */
export function useAnalyticsSummary(range) {
  return useQuery({ queryKey: [...KEY, 'summary', range], queryFn: () => apiGet('/admin/analytics/summary', params(range)) });
}

/** @param {DateRange} range */
export function useDailyEarnings(range) {
  return useQuery({ queryKey: [...KEY, 'daily', range], queryFn: () => apiGet('/admin/analytics/earnings/daily', params(range)) });
}

/** @param {DateRange} range */
export function useBookingAnalytics(range) {
  return useQuery({ queryKey: [...KEY, 'bookings', range], queryFn: () => apiGet('/admin/analytics/bookings', params(range)) });
}

/** @param {DateRange} range @param {number} [limit] */
export function useTopVehicles(range, limit = 10) {
  return useQuery({ queryKey: [...KEY, 'vehicles', range, limit], queryFn: () => apiGet('/admin/analytics/vehicles/top', params(range, { limit })) });
}

/** @param {DateRange} range @param {number} [limit] */
export function useTopOwners(range, limit = 10) {
  return useQuery({ queryKey: [...KEY, 'owners', range, limit], queryFn: () => apiGet('/admin/analytics/owners/top', params(range, { limit })) });
}

/**
 * A rate from the backend as a percentage. The spec doesn't say whether `cancellationRate`/`confirmationRate` are
 * fractions (0.25) or percentages (25); a value of at most 1 is read as a fraction (docs/backend-requests.md item 53).
 * @param {number|null|undefined} rate
 * @returns {number|null}
 */
export function ratePercent(rate) {
  if (rate == null || Number.isNaN(Number(rate))) return null;
  const n = Number(rate);
  return n <= 1 ? n * 100 : n;
}
