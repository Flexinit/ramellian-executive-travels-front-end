import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';

const ENDPOINTS = {
  mine: '/bookings/reports/mine',
  owner: '/bookings/reports/owner',
  admin: '/bookings/reports/admin',
};

/**
 * Reports — `role` picks the endpoint (renter / owner / admin each get their own scoped
 * report). The response is the spec's `BookingReportResponse`: `totalBookings`, the per-outcome
 * counts, `successfulGrossAmount`, `platformRevenue`, `ownerPayout`, and the bookings grouped
 * by outcome (`upcoming`, `active`, `completed`, `cancelled`, `rejected`) — see lib/reports.js.
 *
 * @param {'mine'|'owner'|'admin'} role
 */
export function useReports(role) {
  return useQuery({
    queryKey: ['reports', role],
    queryFn: () => apiGet(ENDPOINTS[role]),
    enabled: !!ENDPOINTS[role],
  });
}
