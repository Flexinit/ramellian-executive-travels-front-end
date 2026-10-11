import { describe, it, expect } from 'vitest';
import { bookedPeriods, isBookedNow, overlappingBooking } from './vehicleBookings';

const NOW = new Date('2026-10-02T12:00:00Z');
const booking = (over) => ({
  id: 'b1',
  vehicleId: 'v1',
  status: 'CONFIRMED',
  startTime: '2026-10-05T09:00:00+03:00',
  endTime: '2026-10-07T09:00:00+03:00',
  ...over,
});

describe('bookedPeriods', () => {
  it("returns only the given vehicle's bookings", () => {
    const periods = bookedPeriods([booking(), booking({ id: 'b2', vehicleId: 'v2' })], 'v1', NOW);
    expect(periods.map((p) => p.id)).toEqual(['b1']);
  });

  it('sorts soonest first', () => {
    const periods = bookedPeriods(
      [booking({ id: 'later', startTime: '2026-11-01T09:00:00+03:00', endTime: '2026-11-03T09:00:00+03:00' }), booking({ id: 'sooner' })],
      'v1',
      NOW
    );
    expect(periods.map((p) => p.id)).toEqual(['sooner', 'later']);
  });

  it('counts pending, confirmed and active bookings as holding the dates', () => {
    const periods = bookedPeriods(
      ['PENDING', 'CONFIRMED', 'ACTIVE'].map((status, i) => booking({ id: `b${i}`, status })),
      'v1',
      NOW
    );
    expect(periods).toHaveLength(3);
  });

  it("ignores bookings that don't hold the dates any more", () => {
    const periods = bookedPeriods(
      ['CANCELLED', 'EXPIRED', 'COMPLETED', 'REJECTED'].map((status, i) => booking({ id: `b${i}`, status })),
      'v1',
      NOW
    );
    expect(periods).toEqual([]);
  });

  it('leaves out bookings that have already finished', () => {
    const past = booking({ startTime: '2026-09-01T09:00:00+03:00', endTime: '2026-09-03T09:00:00+03:00' });
    expect(bookedPeriods([past], 'v1', NOW)).toEqual([]);
  });

  it('copes with no bookings, or bad dates', () => {
    expect(bookedPeriods(undefined, 'v1', NOW)).toEqual([]);
    expect(bookedPeriods([booking({ startTime: 'nonsense' })], 'v1', NOW)).toEqual([]);
  });
});

describe('isBookedNow', () => {
  it('is true only while a booking covers the current moment', () => {
    const current = bookedPeriods([booking({ startTime: '2026-10-01T09:00:00+03:00', endTime: '2026-10-04T09:00:00+03:00' })], 'v1', NOW);
    const future = bookedPeriods([booking()], 'v1', NOW);

    expect(isBookedNow(current, NOW)).toBe(true);
    expect(isBookedNow(future, NOW)).toBe(false);
    expect(isBookedNow([], NOW)).toBe(false);
  });
});

describe('overlappingBooking', () => {
  // The existing booking covers 2026-10-05 09:00 (EAT) – 2026-10-07 09:00 (EAT).
  it('finds a Confirmed booking on the same vehicle whose dates overlap the proposed ones', () => {
    const found = overlappingBooking([booking()], 'v1', '2026-10-06T09:00:00+03:00', '2026-10-08T09:00:00+03:00');
    expect(found).toMatchObject({ id: 'b1', status: 'CONFIRMED' });
  });

  it('finds it even when the proposed dates are identical to the existing booking', () => {
    const found = overlappingBooking([booking()], 'v1', '2026-10-05T09:00:00+03:00', '2026-10-07T09:00:00+03:00');
    expect(found).toBeDefined();
  });

  it('ignores a different vehicle', () => {
    expect(overlappingBooking([booking()], 'v2', '2026-10-05T09:00:00+03:00', '2026-10-07T09:00:00+03:00')).toBeUndefined();
  });

  it('ignores dates that do not actually overlap', () => {
    expect(overlappingBooking([booking()], 'v1', '2026-10-08T09:00:00+03:00', '2026-10-09T09:00:00+03:00')).toBeUndefined();
  });

  it('ignores Cancelled, Expired, Completed and Rejected bookings', () => {
    const bookings = ['CANCELLED', 'EXPIRED', 'COMPLETED', 'REJECTED'].map((status, i) => booking({ id: `b${i}`, status }));
    expect(overlappingBooking(bookings, 'v1', '2026-10-05T09:00:00+03:00', '2026-10-07T09:00:00+03:00')).toBeUndefined();
  });

  it('copes with no bookings, or bad proposed dates', () => {
    expect(overlappingBooking(undefined, 'v1', '2026-10-05T09:00:00+03:00', '2026-10-07T09:00:00+03:00')).toBeUndefined();
    expect(overlappingBooking([booking()], 'v1', 'nonsense', '2026-10-07T09:00:00+03:00')).toBeUndefined();
  });
});
