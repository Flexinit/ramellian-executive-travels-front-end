import { describe, it, expect } from 'vitest';
import { hasPermission } from './permissions';

describe('hasPermission', () => {
  it('allows anything that asks for no permission', () => {
    expect(hasPermission(undefined, ['BOOKING_READ'])).toBe(true);
    expect(hasPermission([], ['BOOKING_READ'])).toBe(true);
  });

  it('allows it when any one of the required permissions is granted', () => {
    expect(hasPermission(['VEHICLE_CREATE', 'VEHICLE_MANAGE'], ['VEHICLE_MANAGE', 'PROFILE_READ'])).toBe(true);
  });

  it('refuses it when none of the required permissions is granted', () => {
    expect(hasPermission(['VEHICLE_CREATE', 'VEHICLE_MANAGE'], ['VEHICLE_READ'])).toBe(false);
  });

  it('judges by role alone (allows it) when the token carries no permission list', () => {
    expect(hasPermission(['VEHICLE_CREATE'], [])).toBe(true);
    expect(hasPermission(['VEHICLE_CREATE'], undefined)).toBe(true);
  });
});
