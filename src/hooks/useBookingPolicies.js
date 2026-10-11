import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';

/**
 * `booking-policy-controller` — new in the live spec (docs/backend-requests.md item 24). Only the
 * renter-facing cancel flow is consumed so far; owner/platform policy management and postponement are not
 * built yet.
 */

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
