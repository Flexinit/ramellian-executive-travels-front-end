// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { bookableTripTypes, bookingWindowProblem, isOwnVehicle, tripTypeLabel, tripTypeProblem } from './vehicleOptions';

describe('isOwnVehicle', () => {
  it('matches the owner email, ignoring case and spaces', () => {
    expect(isOwnVehicle({ ownerEmail: 'Owner@Example.com ' }, { email: 'owner@example.com' })).toBe(true);
  });

  it('is false for someone else, and when either email is unknown', () => {
    expect(isOwnVehicle({ ownerEmail: 'a@example.com' }, { email: 'b@example.com' })).toBe(false);
    expect(isOwnVehicle({}, { email: 'b@example.com' })).toBe(false);
    expect(isOwnVehicle({ ownerEmail: 'a@example.com' }, null)).toBe(false);
  });
});

describe('bookingWindowProblem', () => {
  const window = { availableFrom: '2030-10-01T06:00:00Z', availableTo: '2030-12-01T18:00:00Z' };

  it('accepts a trip inside the dates the owner set', () => {
    expect(bookingWindowProblem(window, '2030-10-05T08:00:00Z', '2030-10-07T08:00:00Z')).toBeNull();
  });

  it('rejects a trip that starts before, or ends after, the window', () => {
    expect(bookingWindowProblem(window, '2030-09-30T08:00:00Z', '2030-10-07T08:00:00Z')).toMatch(/can only be booked from/i);
    expect(bookingWindowProblem(window, '2030-11-30T08:00:00Z', '2030-12-03T08:00:00Z')).toMatch(/until 01 dec 2030/i);
  });

  it('has no restriction for an always-available vehicle', () => {
    expect(bookingWindowProblem({}, '2030-01-01T00:00:00Z', '2031-01-01T00:00:00Z')).toBeNull();
  });
});

describe('tripTypeLabel', () => {
  it('uses the friendly name, and tidies an unknown code', () => {
    expect(tripTypeLabel('AIRPORT_TRANSFER')).toBe('Airport Transfer');
    expect(tripTypeLabel('NEW_KIND')).toBe('New kind');
  });
});

describe('tripTypeProblem', () => {
  const vehicle = { model: 'Rolls-Royce Ghost', tripTypes: ['WEDDING'] };

  it('names the vehicle\'s supported trip types when the chosen one isn\'t among them', () => {
    expect(tripTypeProblem(vehicle, 'SAFARI')).toBe(
      "Rolls-Royce Ghost doesn't support Safari trips — it's only set up for: Wedding."
    );
  });

  it('accepts a trip type the vehicle does support', () => {
    expect(tripTypeProblem(vehicle, 'WEDDING')).toBeNull();
  });

  it('has no restriction when no trip type is chosen, or the vehicle sets none of its own', () => {
    expect(tripTypeProblem(vehicle, null)).toBeNull();
    expect(tripTypeProblem({ model: 'Prado', tripTypes: [] }, 'SAFARI')).toBeNull();
    expect(tripTypeProblem({ model: 'Prado' }, 'SAFARI')).toBeNull();
  });

  it('treats a General vehicle as fine for any trip, e.g. a Wedding', () => {
    expect(tripTypeProblem({ model: 'Mercedes AMG', tripTypes: ['GENERAL'] }, 'WEDDING')).toBeNull();
    expect(tripTypeProblem({ model: 'Benz', tripTypes: ['GENERAL', 'CAKE_TRANSPORTATION'] }, 'SAFARI')).toBeNull();
  });
});

describe('bookableTripTypes', () => {
  const ALL = 8;

  it('offers every trip type for a General or unrestricted vehicle', () => {
    expect(bookableTripTypes({ tripTypes: ['GENERAL'] })).toHaveLength(ALL);
    expect(bookableTripTypes({ tripTypes: [] })).toHaveLength(ALL);
    expect(bookableTripTypes({})).toHaveLength(ALL);
  });

  it('offers only the owner\'s own list when it has no General', () => {
    expect(bookableTripTypes({ tripTypes: ['WEDDING', 'SAFARI'] })).toEqual(['WEDDING', 'SAFARI']);
  });
});
