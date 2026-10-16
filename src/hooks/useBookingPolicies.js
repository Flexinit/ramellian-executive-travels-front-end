import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';

/**
 * `booking-policy-controller` (docs/backend-requests.md item 24): the policy governing a booking, cancelling and
 * postponing under it, and setting the policy — an owner's own (`/booking-policies/owner`) and the platform's
 * default for owners who haven't set one (`/booking-policies/platform`, administrators).
 *
 * `BookingPolicyRequest` / `BookingPolicyResponse` (live spec 2026-10-16), every field required on save:
 * `freeCancellationWindowHours`, `cancellationDeadlineHours`, `lateCancellationRefundPct` (0–100),
 * `postponementAllowed`, `postponementDeadlineHours`, `maxPostponements` — whole numbers, 0 or more.
 */

function policyQuery(scope) {
  return {
    queryKey: ['booking-policies', scope],
    queryFn: () => apiGet(`/booking-policies/${scope}`),
    retry: false,
  };
}

function useSavePolicy(scope) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (policy) => apiPut(`/booking-policies/${scope}`, policy),
    onSuccess: (saved) => {
      queryClient.setQueryData(['booking-policies', scope], saved);
      queryClient.invalidateQueries({ queryKey: ['booking-policies', 'effective'] });
      toast.success('Booking policy saved.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't save the booking policy.")),
  });
}

/** The signed-in owner's own policy (`GET /booking-policies/owner`). */
export const useOwnerPolicy = () => useQuery(policyQuery('owner'));
/** Saves it (`PUT /booking-policies/owner`). */
export const useSaveOwnerPolicy = () => useSavePolicy('owner');
/** The platform's default policy (`GET /booking-policies/platform`), for owners who haven't set their own. */
export const usePlatformPolicy = () => useQuery(policyQuery('platform'));
/** Saves it (`PUT /booking-policies/platform`, administrators). */
export const useSavePlatformPolicy = () => useSavePolicy('platform');

/**
 * Moves a booking to new dates under its owner's policy — `POST /booking-policies/bookings/{bookingId}/postpone`
 * `{ startTime, endTime }` → the updated `BookingResponse`. The backend refuses it when the policy doesn't allow
 * it (too close to pick-up, or postponed too many times already), and says why.
 * Pass `{ bookingId, startTime, endTime }`.
 */
export function usePostponeBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, startTime, endTime }) => apiPost(`/booking-policies/bookings/${bookingId}/postpone`, { startTime, endTime }),
    onSuccess: (_booking, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking-policies', 'effective', bookingId] });
      toast.success('Booking moved to the new dates.');
    },
  });
}

/** The policy actually governing one booking (the owner's own, or the platform default if unset). */
export function useEffectivePolicy(bookingId) {
  return useQuery({
    queryKey: ['booking-policies', 'effective', bookingId],
    queryFn: () => apiGet(`/booking-policies/bookings/${bookingId}/effective`),
    enabled: !!bookingId,
  });
}

/**
 * Cancels a booking under its owner's policy — `POST /booking-policies/bookings/{bookingId}/cancel` →
 * `CancellationResponse` (`bookingStatus`, `paidAmount`, `refundAmount`, `refundPercent`, `message`).
 * Replaces the old blunt `PUT /bookings/{id}/status { status: CANCELLED }`, which had no concept of a
 * refund or a cancellation window at all. Pass the `bookingId` directly.
 */
export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookingId) => apiPost(`/booking-policies/bookings/${bookingId}/cancel`),
    onSuccess: (result, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['booking-policies', 'effective', bookingId] });
      toast.success(result?.message || 'Booking cancelled.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't cancel that booking.")),
  });
}
