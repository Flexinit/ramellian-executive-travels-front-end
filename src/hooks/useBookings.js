import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { useReports } from './useReports';
import { reportBookings } from '../lib/reports';
import { overlappingBooking } from '../lib/vehicleBookings';
import { useAuthStore } from '../store/authStore';

/**
 * Booking queries/mutations per FRONTEND_INTEGRATION.md §5
 * (`GET /bookings/mine`, `GET /bookings/{id}`, `GET /bookings/owner`,
 * `PUT /bookings/{id}/chauffeur`). As with the other resource hooks,
 * endpoints are documented; exact response field names are assumed —
 * verify against VITE_SWAGGER_URL.
 *
 * `useAllBookings` is the one exception: the spec has no "list every booking on the platform"
 * endpoint, so it is built from the admin report (`GET /bookings/reports/admin`), which carries
 * every booking grouped by outcome.
 */

/**
 * Fetches the current renter's own bookings.
 * @param {{ enabled?: boolean, refetchInterval?: number }} [options] — e.g. the inbox polls
 */
export function useMyBookings(options = {}) {
  return useQuery({
    queryKey: ['bookings', 'mine'],
    queryFn: () => apiGet('/bookings/mine'),
    ...options,
  });
}

/**
 * Whether the signed-in renter already holds a Pending/Confirmed/Active booking on `vehicleId` overlapping
 * `[startTime, endTime)` — a second, independently-reliable check `AddToBookingPanel` runs alongside
 * `useVehicleWindowBooked` (`VehicleResponse.booked`), since that field was confirmed live 2026-10-03 to
 * stay `false` even for a vehicle with a real Confirmed booking (docs/backend-requests.md item 25) and so
 * cannot be trusted alone to stop a renter re-booking a vehicle they already hold. This only ever catches
 * *this* renter's own repeat booking — it has no visibility into anyone else's, so it narrows but does not
 * close the gap item 25 describes. Disabled entirely for a signed-out visitor, who has no bookings to check.
 * @param {string} vehicleId
 * @param {string} startTime
 * @param {string} endTime
 */
export function useRenterVehicleOverlap(vehicleId, startTime, endTime) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const enabled = isAuthenticated && !!vehicleId && !!startTime && !!endTime;
  const { data, isLoading } = useMyBookings({ enabled });
  const booking = enabled ? overlappingBooking(data, vehicleId, startTime, endTime) : undefined;
  return { booking, isBooked: !!booking, isLoading: enabled && isLoading };
}

/**
 * Fetches a single booking's full detail by id.
 * @param {string} id
 * @param {object} [options] — e.g. `{ staleTime: 0 }` on the contract/payment/signature pages, so a
 *   booking the owner has just declined (or whose payment hold just ran out) is caught on arrival rather
 *   than shown as still-pending from an earlier, now-stale fetch (see BookingUnavailableNotice).
 */
export function useBooking(id, options = {}) {
  return useQuery({
    queryKey: ['bookings', id],
    queryFn: () => apiGet(`/bookings/${id}`),
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetches bookings across the signed-in owner/manager's fleet.
 * @param {{ enabled?: boolean, refetchInterval?: number }} [options] — e.g. the inbox polls
 */
export function useOwnerBookings(options = {}) {
  return useQuery({
    queryKey: ['bookings', 'owner'],
    queryFn: () => apiGet('/bookings/owner'),
    ...options,
  });
}

/**
 * Every booking on the platform (admin only), newest first, optionally only those with `status`.
 * @param {{ status?: string }} [filters]
 */
export function useAllBookings({ status } = {}) {
  const query = useReports('admin');
  if (!query.data) return query;
  const all = reportBookings(query.data);
  return { ...query, data: status ? all.filter((b) => b.status === status) : all };
}

/** Assigns a chauffeur to a booking; refreshes the owner bookings list on success. */
export function useAssignChauffeur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookingId, chauffeurName }) => apiPut(`/bookings/${bookingId}/chauffeur`, { chauffeurName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'owner'] });
      toast.success('Chauffeur assigned.');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Could not assign chauffeur.');
    },
  });
}

/**
 * Changes a booking's status — `PUT /bookings/{id}/status` `{ status, notes? }` → the updated `BookingResponse`.
 * Pass `{ bookingId, status, notes? }`. The spec says only "string" for `status` (the values are the backend's own —
 * see BOOKING_STATUSES); if the backend refuses one, its message is shown and nothing changes.
 */
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, status, notes }) => apiPut(`/bookings/${bookingId}/status`, { status, ...(notes ? { notes } : {}) }),
    onSuccess: (updated, { bookingId }) => {
      if (updated) queryClient.setQueryData(['bookings', bookingId], updated);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Booking updated.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't update that booking.")),
  });
}

/**
 * Records a payment against a booking — `POST /payments/bookings/{bookingId}/confirm`
 * `{ paymentMethod, transactionReference }` (both required) → the booking's `ContractResponse`.
 * Pass `{ bookingId, paymentMethod, transactionReference }`.
 */
export function useConfirmPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, ...payment }) => apiPost(`/payments/bookings/${bookingId}/confirm`, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Payment recorded.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't record that payment.")),
  });
}
