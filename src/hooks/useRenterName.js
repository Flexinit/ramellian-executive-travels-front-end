import { useCurrentUser } from './useProfile';
import { useAuthStore } from '../store/authStore';

/**
 * The renter's full name for a contract's signature: from the signed-in renter's own profile (first, middle and
 * last name, as on their ID) — the person viewing a contract to accept or sign it is the renter — falling back to
 * the booking's `renterName`, then their email.
 * @param {object} [booking] — a `BookingResponse`
 * @returns {string|undefined}
 */
export function useRenterName(booking) {
  const { data: profile } = useCurrentUser();
  const tokenUser = useAuthStore((s) => s.user);
  const fromProfile = [profile?.firstName, profile?.middleName, profile?.lastName].filter(Boolean).join(' ');
  const fromToken = [tokenUser?.firstName, tokenUser?.lastName].filter(Boolean).join(' ');
  return fromProfile || booking?.renterName || fromToken || profile?.email || tokenUser?.email || undefined;
}
