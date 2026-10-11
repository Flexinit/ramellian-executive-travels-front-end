import { describe, expect, it } from 'vitest';
import { DEFAULT_RATING, ratingOrDefault } from './ratings';

describe('ratingOrDefault', () => {
  it('starts everyone at 5 until there are real reviews', () => {
    expect(DEFAULT_RATING).toBe(5);
    for (const none of [null, undefined, 0, '', NaN, 'abc', -1]) expect(ratingOrDefault(none)).toBe(5);
  });

  it('shows the real rating once there is one', () => {
    expect(ratingOrDefault(4.2)).toBe(4.2);
    expect(ratingOrDefault('3.5')).toBe(3.5);
    expect(ratingOrDefault(1)).toBe(1);
  });
});
