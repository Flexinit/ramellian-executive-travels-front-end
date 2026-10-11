import { parseISO, isValid, differenceInHours } from 'date-fns';

/**
 * Works out what cancelling a booking right now would do, given its owner's effective
 * `BookingPolicyResponse` (`GET /booking-policies/bookings/{bookingId}/effective`) and the booking's own
 * `startTime`. Mirrors the policy's three thresholds: a full refund with enough notice
 * (`freeCancellationWindowHours` or more before pickup), a reduced refund after that but still outside the
 * hard cutoff (`lateCancellationRefundPct`), and refused outright once inside `cancellationDeadlineHours`
 * of pickup — so "it can't be abused a few hours before pickup" is enforced the same way everywhere
 * cancellation is offered (`CancelBookingModal`, shared by `BookingRow` and `BookingDetailPage`).
 *
 * This is only ever a preview: the backend's own `POST /booking-policies/bookings/{bookingId}/cancel`
 * response is the actual outcome. If the policy can't be loaded, callers should fail open (let the
 * cancel attempt through) rather than block on a `null` quote here, since the backend is the real gate.
 *
 * @param {{freeCancellationWindowHours?: number, cancellationDeadlineHours?: number, lateCancellationRefundPct?: number}} policy
 * @param {string} startTime
 * @param {Date} [now]
 * @returns {{allowed: boolean, refundPercent: number, hoursUntilStart: number}|null}
 */
export function cancellationQuote(policy, startTime, now = new Date()) {
  if (!policy || !startTime) return null;
  const start = parseISO(startTime);
  if (!isValid(start)) return null;

  const hoursUntilStart = differenceInHours(start, now);
  const deadline = policy.cancellationDeadlineHours ?? 0;
  const freeWindow = policy.freeCancellationWindowHours ?? 0;

  if (hoursUntilStart < deadline) return { allowed: false, refundPercent: 0, hoursUntilStart };
  if (hoursUntilStart >= freeWindow) return { allowed: true, refundPercent: 100, hoursUntilStart };
  return { allowed: true, refundPercent: policy.lateCancellationRefundPct ?? 0, hoursUntilStart };
}
