import { stripPhoneNumbers } from './contactGuard';

/**
 * Helpers for the backend's notifications (`GET /notifications` → NotificationResponse:
 * id, title, message, type, referenceId, referenceType, read, createdAt).
 */

/** What a notification says, with any phone number removed (the backend doesn't enforce the rule). */
export function notificationText(notification) {
  return {
    title: stripPhoneNumbers(notification?.title).text,
    message: stripPhoneNumbers(notification?.message).text,
  };
}

/** Types that tell an owner about something happening to one of their vehicles' bookings. */
const OWNER_EVENT = /NEW|REQUEST|CREATED|RECEIVED|PAYMENT|PAID/i;

/** Whether a booking notification reads like something for the owner's side to act on, for an account
 * that is both an owner and a renter (an owner-only account is always the owner side; a renter-only
 * account never is). */
function isOwnerSide(notification, { isOwner = false, isRenter = true } = {}) {
  return isOwner && (!isRenter || OWNER_EVENT.test(String(notification?.type || '')));
}

/**
 * Where opening a notification should go, from what it refers to; null when it points at nothing we
 * have a page for. A booking notification goes to the owner's booking page for someone who only
 * owns, the renter's for someone who only rents, and — for an account that is both — the owner's
 * when the notification reads like a new booking or payment on their vehicle.
 *
 * @param {{ type?: string, referenceId?: string, referenceType?: string }} notification
 * @param {{ isOwner?: boolean, isRenter?: boolean }} who
 * @returns {string|null}
 */
export function notificationLink(notification, who = {}) {
  const refType = String(notification?.referenceType || '').toUpperCase();
  const id = notification?.referenceId;

  // "Please sign the contract" (sent to the owner, referenceId = the contract): the contract's signing page, which
  // works out the booking and whose side the reader is on (ContractSignPage).
  if (refType.includes('CONTRACT') && id) return `/contracts/${id}/sign`;
  if (refType.includes('BOOKING') && id) {
    return isOwnerSide(notification, who) ? `/owner/bookings/${id}` : `/dashboard/bookings/${id}`;
  }
  if (/CHAT|MESSAGE/.test(refType)) return '/messages';
  return null;
}

/**
 * The label for a notification's action button — what it invites you to do, not just "open it". An
 * owner's "new booking" notification says **Review Booking** (that page is where Accept/Reject
 * actually happens — see `BookingStatusControl`); anything else booking-shaped says **View Booking**;
 * a chat/message notification says **Reply**; anything without a page to go to (`notificationLink`
 * returns null) gets no button at all.
 *
 * @param {{ type?: string, referenceId?: string, referenceType?: string }} notification
 * @param {{ isOwner?: boolean, isRenter?: boolean }} who
 * @returns {string|null}
 */
export function notificationActionLabel(notification, who = {}) {
  const refType = String(notification?.referenceType || '').toUpperCase();
  if (refType.includes('CONTRACT')) return 'Sign Contract';
  if (refType.includes('BOOKING')) return isOwnerSide(notification, who) ? 'Review Booking' : 'View Booking';
  if (/CHAT|MESSAGE/.test(refType)) return 'Reply';
  return null;
}
