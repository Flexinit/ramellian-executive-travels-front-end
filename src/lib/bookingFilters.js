import { parseISO, isValid, startOfDay, endOfDay } from 'date-fns';
import { bookingPeriodMatches } from './utils';
import { BOOKING_STATUSES } from './constants';

/**
 * Every field a bookings table (My Bookings / Fleet Bookings / All Bookings) can be filtered by, and their
 * "no filter" values — the shape `useBookingFilters` reads from/writes to the URL, and `bookingMatchesFilters`
 * checks a booking against. All empty ('') means "show everything", same as the status filter's own default.
 */
export const EMPTY_BOOKING_FILTERS = Object.freeze({
  status: '',
  period: '',
  tripType: '',
  mode: '',
  from: '',
  to: '',
  vehicle: '',
});

/**
 * Whether `booking` matches every filter that's actually set (unset ones are skipped) — status, when
 * (`bookingPeriodMatches`'s Upcoming/Ongoing/Past), trip type, booking mode, an exact pickup-date range
 * (`from`/`to`, inclusive, compared against `startTime`'s calendar day), and a free-text vehicle search
 * (against `vehicleModel`, falling back to `vehicleId` for a booking whose model name never loaded).
 * @param {object} booking
 * @param {typeof EMPTY_BOOKING_FILTERS} filters
 */
export function bookingMatchesFilters(booking, filters) {
  if (filters.status && booking?.status !== filters.status) return false;
  if (filters.tripType && booking?.tripType !== filters.tripType) return false;
  if (filters.mode && booking?.bookingMode !== filters.mode) return false;
  if (!bookingPeriodMatches(booking, filters.period)) return false;

  if (filters.vehicle) {
    const needle = filters.vehicle.trim().toLowerCase();
    const haystack = String(booking?.vehicleModel || booking?.vehicleId || '').toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  if (filters.from || filters.to) {
    const start = booking?.startTime ? parseISO(booking.startTime) : null;
    if (!isValid(start)) return false;
    if (filters.from) {
      const from = parseISO(filters.from);
      if (isValid(from) && start < startOfDay(from)) return false;
    }
    if (filters.to) {
      const to = parseISO(filters.to);
      if (isValid(to) && start > endOfDay(to)) return false;
    }
  }

  return true;
}

/**
 * How many of `bookings` would show under each status tab, given every *other* filter currently set (but
 * ignoring whichever status `filters` itself happens to hold) — so `BookingStatusTabs` can show "Active (3)"
 * next to each tab without those counts changing just because a different tab is the one currently selected.
 * `'ALL'` holds the count for the All tab (every status at once, same as passing `status: ''`).
 *
 * @param {object[]} bookings
 * @param {typeof EMPTY_BOOKING_FILTERS} filters
 * @returns {Record<string, number>}
 */
export function countBookingsByStatus(bookings = [], filters) {
  const counts = { ALL: 0 };
  for (const status of Object.values(BOOKING_STATUSES)) counts[status] = 0;
  for (const booking of bookings) {
    if (!bookingMatchesFilters(booking, { ...filters, status: '' })) continue;
    counts.ALL += 1;
    if (booking?.status in counts) counts[booking.status] += 1;
  }
  return counts;
}
