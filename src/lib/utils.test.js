import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDateRange,
  calculateDays,
  calculateTotalPrice,
  truncate,
  getInitials,
  buildQueryString,
  bookingStatusLabel,
  bookingStatusVariant,
  isBookingUnfulfilled,
  bookingPeriodMatches,
  canRecordPickup,
  dataUrlToBlob,
} from './utils';

describe('formatCurrency', () => {
  it('formats a number as KES currency', () => {
    expect(formatCurrency(12000)).toBe('KES 12,000');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('KES 0');
  });

  it('returns "KES —" for NaN', () => {
    expect(formatCurrency(NaN)).toBe('KES —');
  });

  it('returns "KES —" for non-number input', () => {
    expect(formatCurrency('abc')).toBe('KES —');
  });
});

describe('formatDate', () => {
  it('formats an ISO date string to "dd MMM yyyy"', () => {
    expect(formatDate('2026-10-01T09:00:00+03:00')).toBe('01 Oct 2026');
  });

  it('returns "—" for an invalid date', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('accepts a Date object', () => {
    expect(formatDate(new Date(2026, 9, 1))).toBe('01 Oct 2026');
  });
});

describe('formatDateTime', () => {
  it('includes time in the output', () => {
    const result = formatDateTime('2026-10-01T09:00:00+03:00');
    expect(result).toContain('Oct 2026');
  });

  it('returns "—" for invalid input', () => {
    expect(formatDateTime('bad')).toBe('—');
  });
});

describe('formatDateRange', () => {
  it('formats a range with day count', () => {
    const result = formatDateRange('2026-10-01T00:00:00Z', '2026-10-04T00:00:00Z');
    expect(result).toContain('Oct 2026');
    expect(result).toContain('3 days');
  });

  it('uses "1 day" for single-day range', () => {
    const result = formatDateRange('2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z');
    expect(result).toContain('1 day');
  });

  it('bills a same-day trip as 1 day, not "0 days" — a calendar breakdown rounds an 8-hour trip down to nothing, but it is a real, billed day', () => {
    const result = formatDateRange('2026-09-29T09:00:00Z', '2026-09-29T17:00:00Z');
    expect(result).toContain('1 day');
    expect(result).not.toContain('0 days');
  });

  it('returns "—" for invalid inputs', () => {
    expect(formatDateRange('bad', 'also-bad')).toBe('—');
  });
});

describe('calculateDays', () => {
  it('calculates whole days between two ISO timestamps', () => {
    expect(calculateDays('2026-10-01T09:00:00Z', '2026-10-04T09:00:00Z')).toBe(3);
  });

  it('returns 0 for equal timestamps', () => {
    expect(calculateDays('2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z')).toBe(0);
  });

  it('returns 0 for invalid input', () => {
    expect(calculateDays('bad', 'also-bad')).toBe(0);
  });
});

describe('calculateTotalPrice', () => {
  it('multiplies daily price by days', () => {
    expect(calculateTotalPrice(8000, 3)).toBe(24000);
  });

  it('returns 0 for non-number inputs', () => {
    expect(calculateTotalPrice('abc', 3)).toBe(0);
  });
});

describe('truncate', () => {
  it('truncates long strings and appends ellipsis', () => {
    const result = truncate('Hello World', 5);
    expect(result).toBe('Hello…');
  });

  it('returns string unchanged if within limit', () => {
    expect(truncate('Short', 100)).toBe('Short');
  });

  it('returns empty string for non-string input', () => {
    expect(truncate(null)).toBe('');
  });
});

describe('getInitials', () => {
  it('returns first letters of first two words', () => {
    expect(getInitials('John Kamau')).toBe('JK');
  });

  it('returns single letter for single name', () => {
    expect(getInitials('Alice')).toBe('A');
  });

  it('uppercases initials', () => {
    expect(getInitials('jane doe')).toBe('JD');
  });

  it('returns "?" for empty input', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials(null)).toBe('?');
  });
});

describe('buildQueryString', () => {
  it('builds a query string from params', () => {
    const qs = buildQueryString({ location: 'Nairobi', minPrice: 4000 });
    expect(qs).toContain('location=Nairobi');
    expect(qs).toContain('minPrice=4000');
  });

  it('omits null, undefined, and empty-string values', () => {
    const qs = buildQueryString({ location: 'Nairobi', minPrice: null, maxPrice: undefined, sort: '' });
    expect(qs).toContain('location=Nairobi');
    expect(qs).not.toContain('minPrice');
    expect(qs).not.toContain('maxPrice');
    expect(qs).not.toContain('sort');
  });

  it('returns empty string when all values are empty', () => {
    expect(buildQueryString({ a: null, b: undefined })).toBe('');
  });
});

describe('bookingStatusLabel', () => {
  it('returns human-readable labels', () => {
    expect(bookingStatusLabel('PENDING')).toBe('Pending Payment');
    expect(bookingStatusLabel('CONFIRMED')).toBe('Confirmed');
    expect(bookingStatusLabel('COMPLETED')).toBe('Completed');
  });

  it('falls back to the raw status for unknown values', () => {
    expect(bookingStatusLabel('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
  });
});

describe('bookingStatusVariant', () => {
  it('returns correct variants for known statuses', () => {
    expect(bookingStatusVariant('ACTIVE')).toBe('success');
    expect(bookingStatusVariant('PENDING')).toBe('warning');
    expect(bookingStatusVariant('CANCELLED')).toBe('danger');
  });

  it('returns "neutral" for unknown statuses', () => {
    expect(bookingStatusVariant('UNKNOWN')).toBe('neutral');
  });
});

describe('isBookingUnfulfilled', () => {
  it('is true when the owner declined it, or its payment hold ran out', () => {
    expect(isBookingUnfulfilled('REJECTED')).toBe(true);
    expect(isBookingUnfulfilled('EXPIRED')).toBe(true);
  });

  it('is false for a renter-cancelled booking, and every other status', () => {
    expect(isBookingUnfulfilled('CANCELLED')).toBe(false);
    expect(isBookingUnfulfilled('PENDING')).toBe(false);
    expect(isBookingUnfulfilled('CONFIRMED')).toBe(false);
    expect(isBookingUnfulfilled('COMPLETED')).toBe(false);
    expect(isBookingUnfulfilled(undefined)).toBe(false);
  });
});

describe('bookingPeriodMatches', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  const upcoming = { startTime: '2026-06-20T09:00:00Z', endTime: '2026-06-22T09:00:00Z' };
  const ongoing = { startTime: '2026-06-14T09:00:00Z', endTime: '2026-06-16T09:00:00Z' };
  const past = { startTime: '2026-06-01T09:00:00Z', endTime: '2026-06-03T09:00:00Z' };

  it('matches everything when no period is chosen ("All time")', () => {
    expect(bookingPeriodMatches(upcoming, '', now)).toBe(true);
    expect(bookingPeriodMatches(past, undefined, now)).toBe(true);
  });

  it('matches UPCOMING only when the trip has not started yet', () => {
    expect(bookingPeriodMatches(upcoming, 'UPCOMING', now)).toBe(true);
    expect(bookingPeriodMatches(ongoing, 'UPCOMING', now)).toBe(false);
    expect(bookingPeriodMatches(past, 'UPCOMING', now)).toBe(false);
  });

  it('matches ONGOING only when now falls between start and end', () => {
    expect(bookingPeriodMatches(ongoing, 'ONGOING', now)).toBe(true);
    expect(bookingPeriodMatches(upcoming, 'ONGOING', now)).toBe(false);
    expect(bookingPeriodMatches(past, 'ONGOING', now)).toBe(false);
  });

  it('matches PAST only once the trip has ended', () => {
    expect(bookingPeriodMatches(past, 'PAST', now)).toBe(true);
    expect(bookingPeriodMatches(ongoing, 'PAST', now)).toBe(false);
    expect(bookingPeriodMatches(upcoming, 'PAST', now)).toBe(false);
  });

  it('is false for a booking with no valid dates, once a period is chosen', () => {
    expect(bookingPeriodMatches({}, 'UPCOMING', now)).toBe(false);
    expect(bookingPeriodMatches({ startTime: 'not-a-date', endTime: 'also-not' }, 'PAST', now)).toBe(false);
  });
});

describe('canRecordPickup', () => {
  const now = new Date('2026-06-15T08:00:00Z');

  it('blocks a pickup recorded before the trip\'s own start date', () => {
    expect(canRecordPickup({ startTime: '2026-06-20T09:00:00Z' }, now)).toBe(false);
  });

  it('allows it from the start of the scheduled pickup day, not just from its exact hour', () => {
    expect(canRecordPickup({ startTime: '2026-06-15T18:00:00Z' }, now)).toBe(true); // later the same day
    expect(canRecordPickup({ startTime: '2026-06-15T00:00:00Z' }, now)).toBe(true);
  });

  it('allows it any time after the pickup day too — this only guards against being early', () => {
    expect(canRecordPickup({ startTime: '2026-06-01T09:00:00Z' }, now)).toBe(true);
  });

  it('does not block on a missing or invalid startTime — nothing to check a date rule against', () => {
    expect(canRecordPickup({}, now)).toBe(true);
    expect(canRecordPickup({ startTime: 'not-a-date' }, now)).toBe(true);
  });
});

describe('dataUrlToBlob', () => {
  it('decodes a data URL into a Blob with the right MIME type and byte length', () => {
    // "hi" base64-encoded, as a stand-in for SignaturePad's real PNG data URL — the point here is the
    // decoding, not the image format itself.
    const blob = dataUrlToBlob('data:image/png;base64,aGk=');
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBe(2);
  });

  it("falls back to a generic MIME type if the data URL's header doesn't declare one", () => {
    const blob = dataUrlToBlob('data:;base64,aGk=');
    expect(blob.type).toBe('application/octet-stream');
  });
});
