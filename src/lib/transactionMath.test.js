import { describe, it, expect } from 'vitest';
import { allocation, bookingReconciliation, chargeBuild, commissionRule, ownerShareCheck, processingRule, transactionCsv } from './transactionMath';

// 3 days at KES 5,000, delivered, 10% commission from the owner's share, Pesapal 3.5% on top for the renter.
const RENTAL = {
  paymentId: 'p1', chargeType: 'RENTAL', baseAmount: 15000, deliveryFee: 1000, driverCharge: 0, processingFee: 560,
  totalCharged: 16560, platformCommission: 1500, ownerPayoutPromised: 13500, ownerPayoutDisbursed: 13500, paymentMethod: 'PESAPAL',
};

describe('transaction math', () => {
  it('builds the total from its lines, and says when they add up', () => {
    const b = chargeBuild(RENTAL);
    expect(b.lines.map((l) => [l.label, l.amount])).toEqual([['Rental', 15000], ['Delivery fee', 1000], ['Processing fee', 560]]);
    expect(b).toMatchObject({ sum: 16560, recorded: 16560, ok: true });
    expect(chargeBuild({ ...RENTAL, totalCharged: 17000 })).toMatchObject({ ok: false, difference: 440 });
  });

  it('splits what was charged into where it went — and names any money not accounted for', () => {
    const a = allocation(RENTAL);
    expect(a.parts.map((p) => [p.key, p.amount])).toEqual([['owner', 13500], ['commission', 1500], ['processing', 560], ['delivery', 1000]]);
    expect(a.unexplained).toBe(0);
    expect(a.parts.reduce((s, p) => s + p.share, 0)).toBeCloseTo(1);

    const short = allocation({ ...RENTAL, ownerPayoutPromised: 13000 });
    expect(short.unexplained).toBe(500);
    expect(short.parts.at(-1)).toMatchObject({ key: 'unexplained', label: 'Not accounted for', amount: 500 });
  });

  it("works the owner's share out as rental less commission, recognising a driver charge passed on", () => {
    expect(ownerShareCheck(RENTAL)).toMatchObject({ expected: 13500, ok: true, note: null });
    const chauffeured = { ...RENTAL, driverCharge: 2000, ownerPayoutPromised: 15500 };
    expect(ownerShareCheck(chauffeured)).toMatchObject({ ok: true, note: 'Includes the driver charge, passed on to the owner.' });
    expect(ownerShareCheck({ ...RENTAL, ownerPayoutPromised: 14200 })).toMatchObject({ expected: 13500, ok: false });
  });

  it('picks the commission rate by the length of the booking', () => {
    const settings = { commissionRatePct: 2, multiDayCommissionRatePct: 10, multiDayThresholdDays: 2 };
    expect(commissionRule(15000, 3, settings)).toMatchObject({ ratePct: 10, expected: 1500 });
    expect(commissionRule(5000, 1, settings)).toMatchObject({ ratePct: 2, expected: 100, rule: 'Standard rate' });
    expect(commissionRule(5000, 1, undefined).ratePct).toBeNull();
  });

  it('works the processing fee out from the payment method', () => {
    expect(processingRule(RENTAL, { pesapalTransactionFeeRatePct: 3.5 })).toMatchObject({ expected: 560, rule: 'Pesapal 3.5% of 16,000' });
    expect(processingRule({ ...RENTAL, paymentMethod: 'MPESA' }, { mpesaStkFee: 30 })).toMatchObject({ expected: 30, rule: 'M-Pesa flat fee' });
  });

  it('reconciles the booking: collected, less the owner, less refunds, against the recorded net profit', () => {
    const f = { totalBilledToRenter: 16560, totalCollectedFromRenter: 16560, totalOwnerPayoutsPromised: 13500, totalPlatformCommission: 1500, totalProcessingFees: 560, platformNetProfit: 3060, charges: [RENTAL] };
    expect(bookingReconciliation(f)).toMatchObject({ kept: 3060, keptMatchesNet: true, unpaidByRenter: 0 });
    expect(bookingReconciliation(f, 1000)).toMatchObject({ kept: 2060, keptMatchesNet: false });
    const csv = transactionCsv(f).split('\n');
    expect(csv[0]).toBe('Charge,Item,Amount (KES)');
    expect(csv).toContain("1. RENTAL,Owner's share,13500");
    expect(csv).toContain('Booking,Platform keeps,3060');
  });
});
