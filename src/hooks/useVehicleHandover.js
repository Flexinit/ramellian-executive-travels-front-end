import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiUpload } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { dataUrlToBlob } from '../lib/utils';

/**
 * Pickup/dropoff handover mutations — `vehicle-handover-controller` in the live OpenAPI spec (confirmed
 * 2026-10-02, replacing the guessed `/bookings/{id}/pickup` / `/bookings/{id}/return` contract proposed in
 * docs/backend-requests.md item 22). The real endpoints live under `/handovers/bookings/{bookingId}/…`:
 * the structured fields (`odometerReading`, `fuelLevel`, `conditionNotes`, `damageNoted`,
 * `damageDescription`, `location`) are query parameters, not form fields — only the signature file goes in
 * the multipart body. Both return a `HandoverResponse` (not a `BookingResponse`), so callers invalidate the
 * booking query rather than seed it directly from this result.
 */

/** Builds the query string both mutations share from the structured handover details. */
function handoverQuery({ odometerReading, fuelLevel, conditionNotes, damageNoted, damageDescription, location }) {
  const params = new URLSearchParams({ odometerReading: String(odometerReading), fuelLevel });
  if (conditionNotes) params.set('conditionNotes', conditionNotes);
  if (damageNoted) params.set('damageNoted', 'true');
  if (damageDescription) params.set('damageDescription', damageDescription);
  if (location) params.set('location', location);
  return params.toString();
}

/** The multipart body both mutations below share — just the signature file. */
function handoverFormData(signature) {
  const formData = new FormData();
  formData.append('signature', dataUrlToBlob(signature), 'signature.png');
  return formData;
}

/** This booking's recorded handovers (pickup and/or dropoff), oldest first as the backend returns them. */
export function useHandovers(bookingId) {
  return useQuery({
    queryKey: ['handovers', bookingId],
    queryFn: () => apiGet(`/handovers/bookings/${bookingId}`),
    enabled: !!bookingId,
  });
}

/**
 * Records the vehicle handover at pickup. `POST /handovers/bookings/{bookingId}/pickup`.
 * The backend refuses this (a 409 "Successful payment is required…") if the booking isn't actually paid
 * for; the caller (the handover modal) also checks this itself first, so the button is never offered at
 * all for an unpaid booking.
 * Pass `{ bookingId, odometerReading, fuelLevel, conditionNotes?, damageNoted?, damageDescription?, location?, signature }`.
 */
export function useRecordPickup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, signature, ...details }) =>
      apiUpload(`/handovers/bookings/${bookingId}/pickup?${handoverQuery(details)}`, handoverFormData(signature), undefined, 'post'),
    onSuccess: (_handover, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['handovers', bookingId] });
      toast.success('Pickup recorded — the vehicle is now out with the renter.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't record the pickup.")),
  });
}

/**
 * Records the vehicle handover at return. `POST /handovers/bookings/{bookingId}/dropoff`.
 * Pass `{ bookingId, odometerReading, fuelLevel, conditionNotes?, damageNoted?, damageDescription?, location?, signature }`.
 */
export function useRecordReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, signature, ...details }) =>
      apiUpload(`/handovers/bookings/${bookingId}/dropoff?${handoverQuery(details)}`, handoverFormData(signature), undefined, 'post'),
    onSuccess: (_handover, { bookingId }) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['handovers', bookingId] });
      toast.success('Return recorded.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't record the return.")),
  });
}
