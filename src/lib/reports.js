import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { bookingMatchesFilters } from './bookingFilters';

/**
 * `BookingReportResponse` (`GET /bookings/reports/{mine|owner|admin}`) doesn't carry a flat list of
 * bookings — it groups them by outcome. These helpers put them back into one list, newest first.
 */

const GROUPS = ['upcoming', 'active', 'completed', 'cancelled', 'rejected'];

/**
 * How each granularity buckets a date: where its bucket starts, the key that identifies it, the label shown
 * on the chart, and how many trailing buckets `bookingsByPeriod` keeps — enough for a meaningful trend
 * without the chart growing unbounded as a fleet's booking history piles up (30 days / 12 weeks / 12 months
 * are all roughly "the last quarter or so" at their own resolution).
 */
const PERIOD_CONFIG = {
  day: {
    bucketStart: (d) => startOfDay(d),
    key: (d) => format(d, 'yyyy-MM-dd'),
    label: (d) => format(d, 'MMM d'),
    maxBuckets: 30,
  },
  week: {
    bucketStart: (d) => startOfWeek(d, { weekStartsOn: 1 }),
    key: (d) => format(d, 'yyyy-MM-dd'),
    label: (d) => `Week of ${format(d, 'MMM d')}`,
    maxBuckets: 12,
  },
  month: {
    bucketStart: (d) => startOfMonth(d),
    key: (d) => format(d, 'yyyy-MM'),
    label: (d) => format(d, 'MMM yyyy'),
    maxBuckets: 12,
  },
};

/** @param {object} [report] a BookingReportResponse @returns {object[]} every booking in it, newest first */
export function reportBookings(report) {
  const seen = new Set();
  return GROUPS.flatMap((group) => (Array.isArray(report?.[group]) ? report[group] : []))
    .filter((booking) => {
      if (!booking?.id || seen.has(booking.id)) return false;
      seen.add(booking.id);
      return true;
    })
    .sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
}

/** The per-outcome counts a report carries, in display order. */
export function reportCounts(report) {
  return [
    { key: 'upcoming', label: 'Upcoming', value: report?.upcomingBookings ?? 0 },
    { key: 'active', label: 'Active', value: report?.activeBookings ?? 0 },
    { key: 'completed', label: 'Completed', value: report?.completedBookings ?? 0 },
    { key: 'cancelled', label: 'Cancelled', value: report?.cancelledBookings ?? 0 },
    { key: 'rejected', label: 'Rejected', value: report?.rejectedBookings ?? 0 },
  ];
}

/** The same 5 outcome groups `reportCounts`/`reportBookings` use, with the label `BookingsChart` shows. */
export const OUTCOME_GROUPS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'rejected', label: 'Rejected' },
];

/**
 * `report`'s bookings bucketed by the calendar day/week/month of `startTime` and outcome group, oldest to
 * newest, for `BookingsChart`'s trend — the generalized form of what used to be month-only. Kept to each
 * granularity's own trailing bucket count (see `PERIOD_CONFIG`) that actually has a booking (an empty report
 * yields `[]` rather than a run of empty buckets).
 * @param {object} [report] a BookingReportResponse
 * @param {'day'|'week'|'month'} [granularity]
 * @returns {Array<{period: string, label: string, upcoming: number, active: number, completed: number, cancelled: number, rejected: number, total: number}>}
 */
export function bookingsByPeriod(report, granularity = 'month') {
  const config = PERIOD_CONFIG[granularity] || PERIOD_CONFIG.month;
  const seen = new Set();
  const buckets = new Map();

  GROUPS.forEach((group) => {
    (Array.isArray(report?.[group]) ? report[group] : []).forEach((booking) => {
      if (!booking?.id || seen.has(booking.id)) return;
      seen.add(booking.id);
      const date = booking.startTime ? new Date(booking.startTime) : null;
      if (!date || Number.isNaN(date.getTime())) return;

      const sortDate = config.bucketStart(date);
      const key = config.key(sortDate);
      if (!buckets.has(key)) {
        buckets.set(key, { period: key, sortDate, upcoming: 0, active: 0, completed: 0, cancelled: 0, rejected: 0 });
      }
      buckets.get(key)[group] += 1;
    });
  });

  return Array.from(buckets.values())
    .sort((a, b) => a.sortDate - b.sortDate)
    .slice(-config.maxBuckets)
    .map(({ sortDate, ...counts }) => ({
      ...counts,
      label: config.label(sortDate),
      total: GROUPS.reduce((sum, group) => sum + counts[group], 0),
    }));
}

/**
 * A booking's own payout to its owner, falling back to an estimate when the field itself isn't usable —
 * confirmed live 2026-10-05 that `BookingResponse.ownerPayout` is `null` on every booking returned by
 * `GET /bookings/mine`, including Completed ones with a real successful payment (whose own
 * `PaymentStatusResponse.ownerPayout` *is* correctly populated there — this is specifically a `BookingResponse`
 * gap, not a platform-wide one). The estimate (`estimatedAmount - platformFee`) matches what most of those
 * same real payments actually paid out, but not all of them: a couple of real bookings' payments showed a
 * nonzero `transactionFee` this doesn't know about, and one pair had a `platformFee` on the payment record
 * that didn't match the one on the booking record at all — see docs/backend-requests.md item 30. This is the
 * best available approximation until the backend fixes `BookingResponse.ownerPayout` itself; it is not exact.
 */
function bookingOwnerPayout(booking) {
  if (typeof booking?.ownerPayout === 'number') return booking.ownerPayout;
  const gross = Number(booking?.estimatedAmount ?? booking?.baseAmount ?? 0);
  return gross - Number(booking?.platformFee || 0);
}

/**
 * The same `BookingReportResponse` shape, kept to only the bookings that pass `filters` — lets the Revenue
 * tab's `ReportSummaryCards`/`BookingsChart` (which otherwise only ever read the backend's own unfiltered
 * totals) respect the exact same status/period/trip-type/mode/date-range/vehicle filters the Bookings tab's
 * own `ReportTable` already offers, since the backend's report endpoints take no filter params of their own
 * to ask for a narrower report directly (confirmed against the live spec 2026-10-05 — `/bookings/reports/
 * {mine|owner|admin}` take no query parameters at all). Each booking stays in whichever outcome group
 * (`upcoming`/`active`/`completed`/`cancelled`/`rejected`) the backend itself already put it in — only that
 * group's own membership narrows — rather than re-deriving the grouping from `booking.status`, which doesn't
 * map onto "upcoming" vs "active" 1:1. The dollar totals (`successfulGrossAmount`/`platformRevenue`/
 * `ownerPayout`) only ever sum the upcoming/active/completed groups, the same assumption the raw report's own
 * unfiltered totals presumably make (a cancelled or rejected booking was never paid for).
 * @param {object} [report] a BookingReportResponse
 * @param {typeof import('./bookingFilters').EMPTY_BOOKING_FILTERS} filters
 */
export function filterReport(report, filters) {
  const groups = Object.fromEntries(
    GROUPS.map((group) => [group, (Array.isArray(report?.[group]) ? report[group] : []).filter((b) => bookingMatchesFilters(b, filters))])
  );
  const paidGroups = ['upcoming', 'active', 'completed'];
  const sum = (field) => paidGroups.reduce((total, group) => total + groups[group].reduce((s, b) => s + (Number(b[field]) || 0), 0), 0);
  const sumOwnerPayout = () => paidGroups.reduce((total, group) => total + groups[group].reduce((s, b) => s + bookingOwnerPayout(b), 0), 0);

  return {
    ...groups,
    totalBookings: GROUPS.reduce((total, group) => total + groups[group].length, 0),
    upcomingBookings: groups.upcoming.length,
    activeBookings: groups.active.length,
    completedBookings: groups.completed.length,
    cancelledBookings: groups.cancelled.length,
    rejectedBookings: groups.rejected.length,
    successfulGrossAmount: sum('estimatedAmount'),
    platformRevenue: sum('platformFee'),
    ownerPayout: sumOwnerPayout(),
  };
}

/** @deprecated kept only for its own existing test coverage and shape (`{month, ...}` instead of
 * `{period, ...}`) — `bookingsByPeriod(report, 'month')` is the generalized version `BookingsChart` now uses. */
export function bookingsByMonth(report) {
  return bookingsByPeriod(report, 'month').map(({ period, ...rest }) => ({ month: period, ...rest }));
}
