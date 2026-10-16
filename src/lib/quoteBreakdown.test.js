import { describe, it, expect } from 'vitest';
import { quoteBreakdown } from './quoteBreakdown';

const item = { vehicle: { dailyPrice: 15000 }, startTime: '2099-10-01T09:00:00Z', endTime: '2099-10-04T09:00:00Z' };
const sum = (lines) => Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;

describe('quoteBreakdown', () => {
  it('lists the rental and the payment processing fee, adding up to what is charged — as the live quote does', () => {
    // Live 2026-10-16: totalAmount = baseAmount + transactionFee.
    const quote = { numberOfDays: 10, pricePerDay: 1, baseAmount: 10, platformFee: 0.2, transactionFee: 0.15, deliveryFee: 0, driverCharge: 0, totalAmount: 10.15 };
    const { lines, total, estimated } = quoteBreakdown(item, quote);

    expect(lines).toEqual([
      { label: '10 days × KES 1', amount: 10 },
      { label: 'Payment processing fee', amount: 0.15 },
    ]);
    expect(total).toBe(10.15);
    expect(sum(lines)).toBe(total);
    expect(estimated).toBe(false);
  });

  it('never shows the platform commission as a line — it comes out of the owner payout', () => {
    const quote = { numberOfDays: 3, pricePerDay: 15000, baseAmount: 45000, platformFee: 900, transactionFee: 675, totalAmount: 45675 };
    expect(quoteBreakdown(item, quote).lines.map((l) => l.label).join(' ')).not.toMatch(/platform|commission|service/i);
  });

  it('adds delivery and a driver when the quote has them', () => {
    const quote = { numberOfDays: 3, pricePerDay: 15000, baseAmount: 45000, deliveryFee: 1500, driverCharge: 6000, transactionFee: 788, totalAmount: 53288 };
    const { lines, total } = quoteBreakdown(item, quote);
    expect(lines.map((l) => l.label)).toEqual(['3 days × KES 15,000', 'Delivery', 'Driver', 'Payment processing fee']);
    expect(sum(lines)).toBe(total);
  });

  it('shows anything the total includes but does not break out as "Other charges", so the lines still add up', () => {
    const quote = { numberOfDays: 3, pricePerDay: 15000, baseAmount: 45000, platformFee: 900, transactionFee: 0, totalAmount: 45900 };
    const { lines, total } = quoteBreakdown(item, quote);
    expect(lines.at(-1)).toEqual({ label: 'Other charges', amount: 900 });
    expect(sum(lines)).toBe(total);
  });

  it('falls back to days × daily price, marked as an estimate, without a quote', () => {
    expect(quoteBreakdown(item, undefined)).toEqual({
      lines: [{ label: '3 days × KES 15,000', amount: 45000 }],
      total: 45000,
      estimated: true,
    });
  });
});
