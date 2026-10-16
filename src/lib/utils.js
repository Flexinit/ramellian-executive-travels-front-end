import { format, formatDuration, isValid, parseISO, isBefore, startOfDay } from 'date-fns';
// date-fns has no Kenyan English locale; enGB matches Kenya's dd MMM yyyy /
// Commonwealth date conventions closely enough for display formatting.
import { enGB } from 'date-fns/locale';
import { ROLE_LABELS } from './constants';

/**
 * Format a number as KES currency.
 * @param {number} amount
 * @returns {string} e.g. "KES 12,000"
 */
/** @param {number} bytes @returns {string} e.g. `68 KB`, `1.2 MB` */
export function formatFileSize(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round((bytes || 0) / 1024))} KB`;
}

export function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'KES —';
  return `KES ${amount.toLocaleString('en-KE')}`;
}

/**
 * Format an ISO date string to "01 Oct 2026".
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '—';
  return format(d, 'dd MMM yyyy', { locale: enGB });
}

/**
 * Format an ISO date string to "01 Oct 2026, 09:00 AM".
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '—';
  return format(d, 'dd MMM yyyy, hh:mm aa', { locale: enGB });
}

/**
 * Format an ISO date string's time-of-day only, e.g. "09:00 AM" — for a table cell that already shows
 * the date via `formatDateRange` and just needs the pickup/return time alongside it, without repeating
 * the full `formatDateTime` date portion twice.
 * @param {string|Date} date
 * @returns {string}
 */
export function formatTime(date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '—';
  return format(d, 'hh:mm aa', { locale: enGB });
}

/**
 * Format a date range as "01 Oct 2026 – 04 Oct 2026 (3 days)". The day count is billable days, not a
 * calendar breakdown — every started 24 hours counts, with a minimum of one (the same rule `billableDays`
 * in `lib/cart.js` uses for an estimate before a booking exists). A same-day booking (e.g. 9am–5pm) is a
 * real, one-day charge; showing "(0 days)" for it — which a raw calendar-duration breakdown would, since
 * 8 hours rounds down to nothing — contradicted what the renter was actually billed.
 * @param {string|Date} start
 * @param {string|Date} end
 * @returns {string}
 */
export function formatDateRange(start, end) {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  if (!isValid(s) || !isValid(e)) return '—';
  const days = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)));
  const dayLabel = days === 1 ? '1 day' : `${days} days`;
  return `${formatDate(s)} – ${formatDate(e)} (${dayLabel})`;
}

/**
 * Calculate the number of whole days between two ISO date strings.
 * @param {string} startTime
 * @param {string} endTime
 * @returns {number}
 */
export function calculateDays(startTime, endTime) {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  if (!isValid(start) || !isValid(end)) return 0;
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate total price from daily rate and number of days.
 * @param {number} dailyPrice
 * @param {number} days
 * @returns {number}
 */
export function calculateTotalPrice(dailyPrice, days) {
  if (typeof dailyPrice !== 'number' || typeof days !== 'number') return 0;
  return dailyPrice * days;
}

/**
 * Truncate a string to a max length, appending "…" if truncated.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength = 100) {
  if (typeof str !== 'string') return '';
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}…`;
}

/**
 * Extract initials from a full name (up to 2 characters).
 * @param {string} name
 * @returns {string} e.g. "JK" from "John Kamau"
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

/**
 * Build a URL query string from an object, omitting null/undefined/empty values.
 * @param {Record<string, any>} params
 * @returns {string} e.g. "?location=Nairobi&minPrice=4000"
 */
export function buildQueryString(params) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

/**
 * Return a human-readable label for a booking status.
 * @param {string} status
 * @returns {string}
 */
export function bookingStatusLabel(status) {
  const labels = {
    PENDING:   'Pending Payment',
    CONFIRMED: 'Confirmed',
    ACTIVE:    'Active',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    EXPIRED:   'Expired',
    REJECTED:  'Rejected',
  };
  return labels[status] ?? status;
}

/**
 * Return the highest-priority role label for a user's role list, per
 * ROLE_LABELS's declared order (ADMIN > MANAGER > OWNER > RENTER) — used to
 * badge a signed-in user with a single, unambiguous role even if the
 * backend ever grants them more than one.
 * @param {string[]} roles
 * @returns {string|null}
 */
export function primaryRoleLabel(roles) {
  if (!Array.isArray(roles)) return null;
  const orderedRole = Object.keys(ROLE_LABELS).find((role) => roles.includes(role));
  return orderedRole ? ROLE_LABELS[orderedRole] : null;
}

/**
 * Return a Tailwind colour class for a booking status badge.
 * @param {string} status
 * @returns {string}
 */
export function bookingStatusVariant(status) {
  const variants = {
    PENDING:   'warning',
    CONFIRMED: 'success',
    ACTIVE:    'success',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    EXPIRED:   'danger',
    REJECTED:  'danger',
  };
  return variants[status] ?? 'neutral';
}

/**
 * Whether a booking didn't happen for a reason other than the renter choosing to cancel it: the owner
 * declined it (`REJECTED` — most often because the vehicle turned out not to actually be available, even
 * though it was listed as bookable), or its pending-payment hold ran out before it was paid (`EXPIRED`).
 * `CANCELLED` is deliberately excluded — a renter cancels their own booking from the same status, and
 * showing them a "we couldn't fulfil this" message about their own action would be confusing.
 * @param {string} status
 * @returns {boolean}
 */
export function isBookingUnfulfilled(status) {
  return status === 'REJECTED' || status === 'EXPIRED';
}

/**
 * Whether `booking`'s trip dates match a `BOOKING_PERIODS` filter value, relative to `now` (a param only so
 * tests can pin it) — `UPCOMING` hasn't started yet, `ONGOING` is between its start and end, `PAST` has
 * already ended. A falsy `period` (the "All time" option) always matches, same as the status filter's own
 * empty-string default.
 * @param {{startTime?: string, endTime?: string}} booking
 * @param {string} period — a `BOOKING_PERIODS` value, or '' / undefined for no filter
 * @param {Date} [now]
 */
export function bookingPeriodMatches(booking, period, now = new Date()) {
  if (!period) return true;
  const start = booking?.startTime ? parseISO(booking.startTime) : null;
  const end = booking?.endTime ? parseISO(booking.endTime) : null;
  if (!isValid(start) || !isValid(end)) return false;
  if (period === 'UPCOMING') return start > now;
  if (period === 'ONGOING') return start <= now && now <= end;
  if (period === 'PAST') return end < now;
  return true;
}

/**
 * Whether a booking's pickup can actually be recorded yet — its trip's own start *date* has to have
 * arrived, not just its status being Confirmed. A handover record is meant to be evidence of the vehicle's
 * condition at the real moment of collection, so it shouldn't be possible to record one days ahead of that.
 * Allows the whole of the scheduled pickup day (not just from its exact hour), and anything after — this
 * only guards against recording it *early*, not a late pickup, which is otherwise fine. A missing/invalid
 * `startTime` doesn't block it — nothing to check a date rule against.
 * @param {{startTime?: string}} booking
 * @param {Date} [now]
 */
export function canRecordPickup(booking, now = new Date()) {
  const start = booking?.startTime ? parseISO(booking.startTime) : null;
  if (!isValid(start)) return true;
  return !isBefore(now, startOfDay(start));
}

/**
 * Decodes a `data:` URL (e.g. `SignaturePad`'s `canvas.toDataURL('image/png')`) into a `Blob`, so it can
 * go up as a real file in a multipart upload. `PUT /payments/contracts/{id}/sign` needs the signature
 * this way — confirmed live: sending it as a JSON string instead crashes with a raw
 * `MultipartException: Current request is not a multipart request` 500, even though the field is still
 * called `signature` either way (see `useSignContract`).
 * @param {string} dataUrl
 * @returns {Blob}
 */
export function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Whether `pathname` is part of booking a vehicle — the basket, checkout, contract, payment (including
 * Pesapal's return page) and signature. Account-setup nudges stay out of the way there: checkout asks for
 * what a booking itself needs (e.g. the phone number) and documents never block it.
 * @param {string} pathname
 */
export function isBookingFlowPath(pathname = '') {
  return pathname === '/booking' || pathname.startsWith('/booking/') || pathname.startsWith('/book/') || pathname.startsWith('/payment/');
}
