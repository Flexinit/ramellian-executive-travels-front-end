import { parseISO, isValid } from 'date-fns';
import { BOOKING_STATUSES } from './constants';

/**
 * Which of an owner's bookings hold a vehicle's dates. A pending booking
 * (awaiting payment) still holds them; cancelled, expired, completed and
 * rejected ones don't. Bookings come from `GET /bookings/owner`
 * (`BookingResponse`: vehicleId, startTime, endTime, status, …).
 */
const HOLDS_DATES = [BOOKING_STATUSES.PENDING, BOOKING_STATUSES.CONFIRMED, BOOKING_STATUSES.ACTIVE];

const toDate = (value) => {
  const d = typeof value === 'string' ? parseISO(value) : value;
  return isValid(d) ? d : null;
};

/**
 * The periods a vehicle is booked, soonest first, leaving out anything that
 * has already finished or no longer holds the dates.
 *
 * @param {Array<{vehicleId: string, startTime: string, endTime: string, status: string}>} bookings
 * @param {string} vehicleId
 * @param {Date} [now]
 * @returns {Array<{id: string, start: Date, end: Date, status: string}>}
 */
export function bookedPeriods(bookings, vehicleId, now = new Date()) {
  return (Array.isArray(bookings) ? bookings : [])
    .filter((b) => b.vehicleId === vehicleId && HOLDS_DATES.includes(String(b.status || '').toUpperCase()))
    .map((b) => ({ id: b.id, start: toDate(b.startTime), end: toDate(b.endTime), status: String(b.status).toUpperCase() }))
    .filter((p) => p.start && p.end && p.end >= now)
    .sort((a, b) => a.start - b.start);
}

/** Whether any of these periods covers `now` — the vehicle is out on a booking right now. */
export function isBookedNow(periods, now = new Date()) {
  return periods.some((p) => p.start <= now && now <= p.end);
}

/**
 * Whether `bookings` (a renter's own list, from `GET /bookings/mine`) already has a Pending/Confirmed/Active
 * booking on `vehicleId` that overlaps `[startTime, endTime)` — checked independently of `VehicleResponse.booked`
 * (confirmed live 2026-10-03 to be unreliable: `false` even for a vehicle with a real Confirmed booking —
 * see docs/backend-requests.md item 25). This can only ever catch the *same renter* re-booking a vehicle
 * they already hold; it has no visibility into anyone else's bookings, so it's a narrower safety net than a
 * correct `booked` field would be, not a replacement for one.
 *
 * @param {Array<{vehicleId: string, startTime: string, endTime: string, status: string}>} bookings
 * @param {string} vehicleId
 * @param {string} startTime
 * @param {string} endTime
 * @returns {{id: string, start: Date, end: Date, status: string}|undefined} the first overlapping booking, if any
 */
export function overlappingBooking(bookings, vehicleId, startTime, endTime) {
  const start = toDate(startTime);
  const end = toDate(endTime);
  if (!start || !end) return undefined;
  return (Array.isArray(bookings) ? bookings : [])
    .filter((b) => b.vehicleId === vehicleId && HOLDS_DATES.includes(String(b.status || '').toUpperCase()))
    .map((b) => ({ id: b.id, start: toDate(b.startTime), end: toDate(b.endTime), status: String(b.status).toUpperCase() }))
    .find((p) => p.start && p.end && p.start < end && start < p.end);
}
