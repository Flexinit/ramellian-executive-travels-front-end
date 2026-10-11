import { describe, it, expect } from 'vitest';
import { bookingsByMonth, filterReport } from './reports';
import { EMPTY_BOOKING_FILTERS } from './bookingFilters';

describe('bookingsByMonth', () => {
  it('returns nothing for an empty or missing report', () => {
    expect(bookingsByMonth(undefined)).toEqual([]);
    expect(bookingsByMonth({})).toEqual([]);
  });

  it('buckets bookings by the calendar month of startTime, oldest first', () => {
    const report = {
      upcoming: [{ id: 'a', startTime: '2026-08-05T09:00:00Z' }],
      completed: [
        { id: 'b', startTime: '2026-07-10T09:00:00Z' },
        { id: 'c', startTime: '2026-07-20T09:00:00Z' },
      ],
      cancelled: [{ id: 'd', startTime: '2026-08-15T09:00:00Z' }],
      rejected: [],
      active: [],
    };

    const months = bookingsByMonth(report);
    expect(months.map((m) => m.month)).toEqual(['2026-07', '2026-08']);

    const jul = months.find((m) => m.month === '2026-07');
    expect(jul).toMatchObject({ label: 'Jul 2026', completed: 2, upcoming: 0, cancelled: 0, active: 0, rejected: 0, total: 2 });

    const aug = months.find((m) => m.month === '2026-08');
    expect(aug).toMatchObject({ label: 'Aug 2026', upcoming: 1, cancelled: 1, total: 2 });
  });

  it('ignores a booking with no id or an unparseable startTime', () => {
    const report = { upcoming: [{ startTime: '2026-08-05T09:00:00Z' }, { id: 'x', startTime: 'not-a-date' }] };
    expect(bookingsByMonth(report)).toEqual([]);
  });

  it('drops a booking repeated across groups rather than double-counting it', () => {
    const duplicate = { id: 'dup', startTime: '2026-08-05T09:00:00Z' };
    const months = bookingsByMonth({ upcoming: [duplicate], active: [duplicate] });
    expect(months).toHaveLength(1);
    expect(months[0].total).toBe(1);
  });
});

describe('filterReport', () => {
  const REPORT = {
    upcoming: [{ id: 'a', status: 'CONFIRMED', vehicleModel: 'Prado', estimatedAmount: 1000, platformFee: 20, ownerPayout: 980 }],
    active: [{ id: 'b', status: 'ACTIVE', vehicleModel: 'Prado', estimatedAmount: 2000, platformFee: 40, ownerPayout: 1960 }],
    completed: [{ id: 'c', status: 'COMPLETED', vehicleModel: 'Vitz', estimatedAmount: 500, platformFee: 10, ownerPayout: 490 }],
    cancelled: [{ id: 'd', status: 'CANCELLED', vehicleModel: 'Vitz', estimatedAmount: 300, platformFee: 6, ownerPayout: 294 }],
    rejected: [{ id: 'e', status: 'REJECTED', vehicleModel: 'Vitz', estimatedAmount: 0, platformFee: 0, ownerPayout: 0 }],
  };

  it('with no filters set, keeps every booking and sums money only across upcoming/active/completed', () => {
    const result = filterReport(REPORT, EMPTY_BOOKING_FILTERS);
    expect(result.totalBookings).toBe(5);
    expect(result.upcomingBookings).toBe(1);
    expect(result.cancelledBookings).toBe(1);
    expect(result.successfulGrossAmount).toBe(1000 + 2000 + 500);
    expect(result.platformRevenue).toBe(20 + 40 + 10);
    expect(result.ownerPayout).toBe(980 + 1960 + 490);
  });

  it('narrows every group, and the money totals, to a vehicle search', () => {
    const result = filterReport(REPORT, { ...EMPTY_BOOKING_FILTERS, vehicle: 'Vitz' });
    expect(result.totalBookings).toBe(3);
    expect(result.upcomingBookings).toBe(0);
    expect(result.completedBookings).toBe(1);
    expect(result.cancelledBookings).toBe(1);
    expect(result.rejectedBookings).toBe(1);
    // Only Vitz's completed booking counts toward the money totals — cancelled/rejected never do.
    expect(result.successfulGrossAmount).toBe(500);
    expect(result.ownerPayout).toBe(490);
  });

  it('narrows to a single status, same as the status filter everywhere else', () => {
    const result = filterReport(REPORT, { ...EMPTY_BOOKING_FILTERS, status: 'ACTIVE' });
    expect(result.totalBookings).toBe(1);
    expect(result.activeBookings).toBe(1);
    expect(result.successfulGrossAmount).toBe(2000);
  });

  it('returns an all-zero, empty-groups shape for a missing report', () => {
    const result = filterReport(undefined, EMPTY_BOOKING_FILTERS);
    expect(result.totalBookings).toBe(0);
    expect(result.successfulGrossAmount).toBe(0);
    expect(result.upcoming).toEqual([]);
  });

  it('falls back to estimatedAmount minus platformFee when a booking carries no ownerPayout of its own', () => {
    // Confirmed live 2026-10-05: BookingResponse.ownerPayout is null on every real booking, Completed ones
    // included — this is the approximation that stands in for it until the backend actually populates it.
    const report = {
      completed: [{ id: 'c', status: 'COMPLETED', estimatedAmount: 100, platformFee: 2, ownerPayout: null }],
      upcoming: [],
      active: [],
      cancelled: [],
      rejected: [],
    };
    const result = filterReport(report, EMPTY_BOOKING_FILTERS);
    expect(result.ownerPayout).toBe(98);
  });
});
