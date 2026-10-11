import { describe, it, expect } from 'vitest';
import { cancellationQuote } from './cancellation';

const POLICY = {
  freeCancellationWindowHours: 48,
  cancellationDeadlineHours: 6,
  lateCancellationRefundPct: 50,
};

const NOW = new Date('2026-07-01T00:00:00Z');

describe('cancellationQuote', () => {
  it('returns null without a policy or a start time', () => {
    expect(cancellationQuote(null, '2026-07-03T00:00:00Z', NOW)).toBeNull();
    expect(cancellationQuote(POLICY, undefined, NOW)).toBeNull();
    expect(cancellationQuote(POLICY, 'not-a-date', NOW)).toBeNull();
  });

  it('gives a full refund with at least the free-cancellation window of notice', () => {
    const quote = cancellationQuote(POLICY, '2026-07-03T00:00:00Z', NOW); // 48h away
    expect(quote).toEqual({ allowed: true, refundPercent: 100, hoursUntilStart: 48 });
  });

  it('gives the late-cancellation refund inside the free window but outside the deadline', () => {
    const quote = cancellationQuote(POLICY, '2026-07-01T20:00:00Z', NOW); // 20h away
    expect(quote).toEqual({ allowed: true, refundPercent: 50, hoursUntilStart: 20 });
  });

  it('refuses the cancellation outright once inside the hard deadline', () => {
    const quote = cancellationQuote(POLICY, '2026-07-01T04:00:00Z', NOW); // 4h away
    expect(quote).toEqual({ allowed: false, refundPercent: 0, hoursUntilStart: 4 });
  });

  it('refuses a cancellation attempted after the trip has already started', () => {
    const quote = cancellationQuote(POLICY, '2026-06-30T12:00:00Z', NOW); // already started
    expect(quote.allowed).toBe(false);
    expect(quote.hoursUntilStart).toBeLessThan(0);
  });
});
