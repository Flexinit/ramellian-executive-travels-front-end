import { describe, it, expect } from 'vitest';
import { amountToPay } from './paymentTotal';

// The dev backend's settings on 2026-11-04.
const SETTINGS = { pesapalTransactionFeeRatePct: 1.5, mpesaStkFee: 33, mpesaB2cFee: 50 };

describe('amountToPay — what the renter is actually asked for', () => {
  it('by M-Pesa: the rental plus one processing fee — the M-Pesa payment and transfer fees (KES 1 + 83 = 84)', () => {
    const { lines, total } = amountToPay({ baseAmount: 1, numberOfDays: 1 }, { dailyPrice: 1 }, SETTINGS, 'mpesa');
    expect(total).toBe(84);
    expect(lines.map((l) => [l.label, l.amount])).toEqual([['Rental', 1], ['Processing fee', 83]]);
    expect(lines[0].note).toBe('KES 1 a day × 1 day');
  });

  it('by card: the Pesapal percentage of the rental, delivery and driver', () => {
    const { lines, total } = amountToPay({ baseAmount: 15000, deliveryFee: 1000, numberOfDays: 3 }, null, SETTINGS, 'pesapal');
    expect(lines.at(-1)).toMatchObject({ label: 'Processing fee', amount: 240 });
    expect(total).toBe(16240);
  });

  it('works the rental out from the daily price when the booking does not give it', () => {
    expect(amountToPay({ numberOfDays: 2 }, { dailyPrice: 5000 }, {}, 'mpesa').total).toBe(10000);
  });

  it('leaves out a fee switched off in Platform Settings', () => {
    const off = { ...SETTINGS, mpesaB2cFeeEnabled: false };
    expect(amountToPay({ baseAmount: 1 }, null, off, 'mpesa').total).toBe(34);
    expect(amountToPay({ baseAmount: 1000 }, null, { ...SETTINGS, pesapalTransactionFeeEnabled: false }, 'pesapal').lines.map((l) => l.key)).toEqual(['rental']);
  });
});
