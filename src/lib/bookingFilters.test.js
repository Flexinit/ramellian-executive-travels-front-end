import { describe, it, expect } from 'vitest';
import { EMPTY_BOOKING_FILTERS, bookingMatchesFilters, countBookingsByStatus } from './bookingFilters';

const BOOKING = {
  status: 'CONFIRMED',
  tripType: 'SAFARI',
  bookingMode: 'SELF_DRIVE',
  vehicleModel: 'Land Cruiser Prado',
  startTime: '2026-07-10T09:00:00Z',
  endTime: '2026-07-12T09:00:00Z',
};

describe('bookingMatchesFilters', () => {
  it('matches everything when no filter is set', () => {
    expect(bookingMatchesFilters(BOOKING, EMPTY_BOOKING_FILTERS)).toBe(true);
  });

  it('filters by status', () => {
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, status: 'CONFIRMED' })).toBe(true);
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, status: 'CANCELLED' })).toBe(false);
  });

  it('filters by trip type', () => {
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, tripType: 'SAFARI' })).toBe(true);
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, tripType: 'WEDDING' })).toBe(false);
  });

  it('filters by booking mode', () => {
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, mode: 'SELF_DRIVE' })).toBe(true);
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, mode: 'CHAUFFEURED' })).toBe(false);
  });

  it('filters by when (Upcoming/Ongoing/Past), delegating to bookingPeriodMatches', () => {
    // BOOKING's dates (Jul 2026) are already in the past relative to the real clock this test runs under.
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, period: 'PAST' })).toBe(true);
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, period: 'UPCOMING' })).toBe(false);
  });

  it('filters by a vehicle name search, case-insensitively', () => {
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, vehicle: 'prado' })).toBe(true);
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, vehicle: 'Rolls' })).toBe(false);
  });

  it('filters by a pickup-date range, inclusive of both ends', () => {
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, from: '2026-07-10', to: '2026-07-10' })).toBe(true);
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, from: '2026-07-11' })).toBe(false);
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, to: '2026-07-09' })).toBe(false);
    expect(bookingMatchesFilters(BOOKING, { ...EMPTY_BOOKING_FILTERS, from: '2026-07-01', to: '2026-07-31' })).toBe(true);
  });

  it('excludes a booking with no valid startTime once a date range is set', () => {
    expect(bookingMatchesFilters({ ...BOOKING, startTime: undefined }, { ...EMPTY_BOOKING_FILTERS, from: '2026-07-01' })).toBe(false);
  });

  it('combines every set filter with AND', () => {
    const filters = { ...EMPTY_BOOKING_FILTERS, status: 'CONFIRMED', tripType: 'SAFARI', mode: 'SELF_DRIVE', vehicle: 'prado' };
    expect(bookingMatchesFilters(BOOKING, filters)).toBe(true);
    expect(bookingMatchesFilters(BOOKING, { ...filters, mode: 'CHAUFFEURED' })).toBe(false);
  });
});

describe('countBookingsByStatus', () => {
  const BOOKINGS = [
    { ...BOOKING, status: 'CONFIRMED' },
    { ...BOOKING, status: 'CONFIRMED' },
    { ...BOOKING, status: 'PENDING' },
    { ...BOOKING, status: 'CANCELLED', tripType: 'WEDDING' },
  ];

  it('counts every status, and ALL, ignoring whichever status is currently selected', () => {
    const counts = countBookingsByStatus(BOOKINGS, { ...EMPTY_BOOKING_FILTERS, status: 'PENDING' });
    expect(counts).toMatchObject({ CONFIRMED: 2, PENDING: 1, CANCELLED: 1, ACTIVE: 0, ALL: 4 });
  });

  it('still applies every other filter, so a tab shows what picking it would actually leave', () => {
    const counts = countBookingsByStatus(BOOKINGS, { ...EMPTY_BOOKING_FILTERS, tripType: 'SAFARI' });
    // Only the WEDDING-tagged CANCELLED booking is excluded by the trip-type filter.
    expect(counts).toMatchObject({ CONFIRMED: 2, PENDING: 1, CANCELLED: 0, ALL: 3 });
  });

  it('is all zero for an empty or missing list', () => {
    expect(countBookingsByStatus([], EMPTY_BOOKING_FILTERS)).toMatchObject({ CONFIRMED: 0, ALL: 0 });
    expect(countBookingsByStatus(undefined, EMPTY_BOOKING_FILTERS)).toMatchObject({ CONFIRMED: 0, ALL: 0 });
  });
});
