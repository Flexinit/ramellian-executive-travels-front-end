import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';

/**
 * Reviews — the `/reviews` endpoints of the live spec (a `ReviewResponse` has `id`, `vehicleId`,
 * `reviewerEmail`, `rating`, `feedback` and `complaint`; it carries no date):
 *  - `GET /reviews/vehicles/{vehicleId}` — what renters said about a vehicle
 *  - `GET /reviews/owners/{ownerId}` — what renters said about an owner's vehicles
 *  - `POST /reviews/bookings/{bookingId}` `{ rating (1–5), feedback?, complaint? }` (each text up to 2000 characters)
 *    — a renter reviews a booking
 */

export function useVehicleReviews(vehicleId) {
  return useQuery({ queryKey: ['reviews', 'vehicle', vehicleId], queryFn: () => apiGet(`/reviews/vehicles/${vehicleId}`), enabled: !!vehicleId });
}

/** Reviews owners have left about a renter (`GET /reviews/renters/{renterId}`, live spec 2026-10-16). Needs the
 * renter's id, which `BookingResponse` doesn't carry yet (docs/backend-requests.md item 41). */
export function useRenterReviews(renterId) {
  return useQuery({ queryKey: ['reviews', 'renter', renterId], queryFn: () => apiGet(`/reviews/renters/${renterId}`), enabled: !!renterId });
}

export function useOwnerReviews(ownerId) {
  return useQuery({ queryKey: ['reviews', 'owner', ownerId], queryFn: () => apiGet(`/reviews/owners/${ownerId}`), enabled: !!ownerId });
}

/**
 * Reviews a booking — the renter reviewing the vehicle (`POST /reviews/bookings/{id}`), or, with
 * `target: 'renter'`, the owner reviewing the renter (`POST /reviews/bookings/{id}/renter`, live spec 2026-10-16).
 * `ReviewRequest`: `rating` (1–5) and `customerSatisfied` are required; `feedback`, `complaint` optional (≤2000).
 * Pass `{ bookingId, target?, rating, customerSatisfied, feedback?, complaint? }`.
 */
export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, target, ...review }) =>
      apiPost(target === 'renter' ? `/reviews/bookings/${bookingId}/renter` : `/reviews/bookings/${bookingId}`, review),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Thank you — your review was sent.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't send your review.")),
  });
}
