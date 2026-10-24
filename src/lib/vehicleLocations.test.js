import { describe, it, expect } from 'vitest';
import { isSameLocation, locationFacets, priceBounds, UNKNOWN_LOCATION } from './vehicleLocations';

const cars = [
  { id: 1, location: 'Nairobi CBD', pricePerDay: 22000 },
  { id: 2, location: ' nairobi   cbd ', pricePerDay: 8000 },
  { id: 3, location: 'Mombasa', pricePerDay: 12000 },
  { id: 4, location: 'Roysambu', pricePerDay: 15000 },
  { id: 5, location: '', pricePerDay: 9000 },
];

describe('locationFacets', () => {
  it('counts vehicles per place, treating spelling that differs only in case or spacing as one place', () => {
    expect(locationFacets(cars)).toEqual([
      { name: 'Nairobi CBD', count: 2 },
      { name: 'Mombasa', count: 1 },
      { name: 'Roysambu', count: 1 },
    ]);
  });

  it('leaves out vehicles with no location, and copes with nothing', () => {
    expect(locationFacets([{ location: null }])).toEqual([]);
    expect(locationFacets()).toEqual([]);
  });
});

describe('isSameLocation', () => {
  it('matches ignoring case and spacing, and never matches an empty filter', () => {
    expect(isSameLocation('Nairobi CBD', 'nairobi  cbd')).toBe(true);
    expect(isSameLocation('Mombasa', 'Nairobi')).toBe(false);
    expect(isSameLocation('Mombasa', '')).toBe(false);
  });
});

describe('priceBounds', () => {
  it('runs from 0 up to just past the dearest vehicle', () => {
    expect(priceBounds(cars)).toEqual({ min: 0, max: 25000, step: 500 });
  });

  it('is never a stub: at least KES 10,000, even with no vehicles', () => {
    expect(priceBounds([{ pricePerDay: 3000 }]).max).toBe(10000);
    expect(priceBounds([]).max).toBe(10000);
  });

  it('reads the dailyPrice alias too', () => {
    expect(priceBounds([{ dailyPrice: 31000 }]).max).toBe(35000);
  });
});
