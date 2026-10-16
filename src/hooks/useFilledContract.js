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
 * @param {string|Date} [agreementDate] — when the agreement was made (the contract's `acceptedAt`); today
 *   while it's still being reviewed
 * @param {{ asOwner?: boolean }} [options] — the owner is viewing: their own profile isn't the renter's, so the
 *   renter's details come from the booking only
 */
export function useFilledContract(bookingId, text, agreementDate, { asOwner = false } = {}) {
  const { data: booking } = useBooking(bookingId);
  const { data: vehicle } = useVehicle(booking?.vehicleId);
  const { data: renter } = useCurrentUser();
  const { data: policy } = useEffectivePolicy(bookingId);
  if (!text) return text;
  const now = agreementDate ? new Date(agreementDate) : new Date();
  return fillContractText(text, contractValues({ booking: booking || {}, vehicle: vehicle || {}, renter: asOwner ? {} : renter || {}, policy, now }));
}
