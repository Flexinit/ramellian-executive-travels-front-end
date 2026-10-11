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

export function useOwnerReviews(ownerId) {
  return useQuery({ queryKey: ['reviews', 'owner', ownerId], queryFn: () => apiGet(`/reviews/owners/${ownerId}`), enabled: !!ownerId });
}

/** Reviews a booking. Pass `{ bookingId, rating, feedback?, complaint? }`. */
export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, ...review }) => apiPost(`/reviews/bookings/${bookingId}`, review),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Thank you — your review was sent.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't send your review.")),
  });
}
