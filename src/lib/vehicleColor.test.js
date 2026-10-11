import { describe, it, expect } from 'vitest';
import { vehicleColorToCss } from './vehicleColor';

describe('vehicleColorToCss', () => {
  it('matches a plain color name', () => {
    expect(vehicleColorToCss('Red')).toBe('#F87171');
    expect(vehicleColorToCss('Blue')).toBe('#60A5FA');
  });

  it('matches a color word inside free text an owner typed', () => {
    expect(vehicleColorToCss('Pearl White')).toBe('#F4F4F5');
    expect(vehicleColorToCss('Metallic Silver')).toBe('#C7CCD6');
    expect(vehicleColorToCss('Jet Black')).toBe('#9CA3AF');
  });

  it('is case-insensitive', () => {
    expect(vehicleColorToCss('CHAMPAGNE')).toBe('#C9A84C');
  });

  it('falls back to a neutral grey for an unrecognized or missing color', () => {
    expect(vehicleColorToCss('Chameleon')).toBe('#8A93A6');
    expect(vehicleColorToCss('')).toBe('#8A93A6');
    expect(vehicleColorToCss(undefined)).toBe('#8A93A6');
  });
});
