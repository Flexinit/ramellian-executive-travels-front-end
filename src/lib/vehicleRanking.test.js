import { describe, it, expect } from 'vitest';
import { isNewListing, isRecommendedSort, newestOrder, recommendedOrder } from './vehicleRanking';

const ids = (list) => list.map((v) => v.id);

describe('recommendedOrder', () => {
  it('puts vehicles free for the dates before booked ones', () => {
    expect(ids(recommendedOrder([{ id: 'a', isBooked: true }, { id: 'b' }]))).toEqual(['b', 'a']);
  });

  it('then the higher rated first, counting an unrated vehicle at the rating its card shows (5)', () => {
    expect(ids(recommendedOrder([{ id: 'a', rating: 3.2 }, { id: 'b', rating: 4.8 }, { id: 'c', rating: null }]))).toEqual(['c', 'b', 'a']);
  });

  it('then one with a photo before one without', () => {
    expect(ids(recommendedOrder([{ id: 'a', photos: [] }, { id: 'b', photos: [{ url: 'x' }] }]))).toEqual(['b', 'a']);
  });

  it('otherwise keeps the order it was given, and leaves the input alone', () => {
    const input = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(ids(recommendedOrder(input))).toEqual(['a', 'b', 'c']);
    expect(recommendedOrder(input)).not.toBe(input);
  });
});

describe('newest listings', () => {
  const NOW = Date.parse('2026-10-09T12:00:00Z');

  it('orders by when the vehicle was approved (went live), newest first, unknown dates last', () => {
    const list = [
      { id: 'old', reviewedAt: '2026-09-25T10:00:00Z' },
      { id: 'none' },
      { id: 'new', reviewedAt: '2026-10-06T10:00:00Z' },
    ];
    expect(ids(newestOrder(list))).toEqual(['new', 'old', 'none']);
  });

  it('marks a listing "New" for 7 days after it went live', () => {
    expect(isNewListing({ reviewedAt: '2026-10-06T10:00:00Z' }, NOW)).toBe(true);
    expect(isNewListing({ reviewedAt: '2026-09-28T10:00:00Z' }, NOW)).toBe(false);
    expect(isNewListing({}, NOW)).toBe(false);
  });

  it('breaks a Recommended tie with the newer listing', () => {
    const list = [{ id: 'old', reviewedAt: '2026-09-25T10:00:00Z' }, { id: 'new', reviewedAt: '2026-10-06T10:00:00Z' }];
    expect(ids(recommendedOrder(list))).toEqual(['new', 'old']);
  });
});

describe('isRecommendedSort', () => {
  it('is the default, and only "recommended" otherwise', () => {
    expect(isRecommendedSort(undefined)).toBe(true);
    expect(isRecommendedSort('recommended')).toBe(true);
    expect(isRecommendedSort('price_asc')).toBe(false);
  });
});
