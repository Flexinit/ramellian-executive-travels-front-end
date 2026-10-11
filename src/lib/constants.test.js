import { describe, it, expect } from 'vitest';
import {
  BOOKING_MODES,
  TRIP_TYPES,
  TRIP_TYPE_LABELS,
  SORT_OPTIONS,
  FUEL_TYPES,
  TRANSMISSION_TYPES,
  VEHICLE_TIERS,
  USER_ROLES,
  normalizeRoles,
  DOCUMENT_TYPES,
  DOCUMENT_STATUSES,
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  BOOKING_EXPIRY_MS,
  PAYMENT_POLL_INTERVAL_MS,
  PAYMENT_POLL_MAX_ATTEMPTS,
  RENTER_NOTES_MAX_LENGTH,
  SEARCH_DEBOUNCE_MS,
} from './constants';
import { VEHICLE_TRIP_TYPES } from './vehicleOptions';

describe('constants', () => {
  it('BOOKING_MODES contains SELF_DRIVE and CHAUFFEURED', () => {
    expect(BOOKING_MODES.SELF_DRIVE).toBe('SELF_DRIVE');
    expect(BOOKING_MODES.CHAUFFEURED).toBe('CHAUFFEURED');
  });

  it('BOOKING_MODES is frozen', () => {
    expect(Object.isFrozen(BOOKING_MODES)).toBe(true);
  });

  it('TRIP_TYPES has all 8 types', () => {
    const keys = Object.keys(TRIP_TYPES);
    expect(keys).toHaveLength(8);
    expect(keys).toContain('GENERAL');
    expect(keys).toContain('AIRPORT_TRANSFER');
    expect(keys).toContain('CAKE_TRANSPORTATION');
  });

  it('TRIP_TYPES matches the vehicle trip-type enum the backend validates bookings against', () => {
    expect(Object.values(TRIP_TYPES).sort()).toEqual(VEHICLE_TRIP_TYPES.map((t) => t.value).sort());
  });

  it('TRIP_TYPE_LABELS has a label for every TRIP_TYPE', () => {
    Object.values(TRIP_TYPES).forEach((type) => {
      expect(TRIP_TYPE_LABELS[type]).toBeDefined();
      expect(typeof TRIP_TYPE_LABELS[type]).toBe('string');
    });
  });

  it('SORT_OPTIONS is an array of 6 {value, label} objects', () => {
    expect(Array.isArray(SORT_OPTIONS)).toBe(true);
    expect(SORT_OPTIONS).toHaveLength(6);
    SORT_OPTIONS.forEach((opt) => {
      expect(opt).toHaveProperty('value');
      expect(opt).toHaveProperty('label');
    });
  });

  it('USER_ROLES contains RENTER, OWNER, MANAGER, ADMIN', () => {
    expect(USER_ROLES.RENTER).toBe('RENTER');
    expect(USER_ROLES.OWNER).toBe('OWNER');
    expect(USER_ROLES.MANAGER).toBe('MANAGER');
    expect(USER_ROLES.ADMIN).toBe('ADMIN');
  });

  it('numeric constants have correct values', () => {
    expect(BOOKING_EXPIRY_MS).toBe(15 * 60 * 1000);
    expect(PAYMENT_POLL_INTERVAL_MS).toBe(3000);
    expect(PAYMENT_POLL_MAX_ATTEMPTS).toBe(10);
    expect(RENTER_NOTES_MAX_LENGTH).toBe(1000);
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
  });

  it('all constant objects are frozen', () => {
    [
      FUEL_TYPES,
      TRANSMISSION_TYPES,
      VEHICLE_TIERS,
      DOCUMENT_TYPES,
      DOCUMENT_STATUSES,
      BOOKING_STATUSES,
      PAYMENT_STATUSES,
    ].forEach((obj) => {
      expect(Object.isFrozen(obj)).toBe(true);
    });
  });
});

describe('normalizeRoles — the roles the live backend really sends', () => {
  it('reads SUPER_ADMIN as an administrator and MANAGE as a manager', () => {
    expect(normalizeRoles(['SUPER_ADMIN', 'MANAGE', 'CAR_OWNER'])).toEqual(['ADMIN', 'MANAGER', 'OWNER']);
  });

  it('still maps the car roles, keeps canonical names, and drops duplicates', () => {
    expect(normalizeRoles(['CAR_RENTER', 'RENTER', 'ADMIN', 'SUPER_ADMIN'])).toEqual(['RENTER', 'ADMIN']);
    expect(normalizeRoles(undefined)).toEqual([]);
  });
});

