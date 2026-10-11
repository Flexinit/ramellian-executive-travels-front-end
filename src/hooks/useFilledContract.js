import { useBooking } from './useBookings';
import { useVehicle } from './useVehicles';
import { useCurrentUser } from './useProfile';
import { useEffectivePolicy } from './useBookingPolicies';
import { contractValues, fillContractText } from '../lib/contractFields';

/**
 * A contract's text with its `{{field}}`s filled in from this booking — the booking itself, its vehicle, the
 * signed-in renter's own profile, and the cancellation terms in effect for it — for the renter reading it
 * before accepting and signing. On screen only: see `lib/contractFields.js` for what the backend still does
 * (and doesn't) with the stored contract. Anything still loading or missing shows as a blank line, never a
 * raw `{{…}}`.
 * @param {string} bookingId
 * @param {string} text — the contract text as the backend returned it
 */
export function useFilledContract(bookingId, text) {
  const { data: booking } = useBooking(bookingId);
  const { data: vehicle } = useVehicle(booking?.vehicleId);
  const { data: renter } = useCurrentUser();
  const { data: policy } = useEffectivePolicy(bookingId);
  if (!text) return text;
  return fillContractText(text, contractValues({ booking: booking || {}, vehicle: vehicle || {}, renter: renter || {}, policy }));
}
