/**
 * The arithmetic behind one booking's money, worked out line by line so an administrator can follow — and check — every
 * figure the backend recorded (`BookingFinancialSummary` / `ChargeRecord`, GET /admin/financials/bookings/{id}). Every
 * check compares a figure worked out from its parts with the one recorded, allowing `TOLERANCE` for rounding; nothing
 * here decides what the money *should* be — the backend does — it only shows how the recorded figures fit together, and
 * flags where they don't.
 *
 * Platform rule (product owner): the commission comes out of the owner's share, not on top of the renter's price.
 */

/** Differences up to this many shillings are rounding. */
export const TOLERANCE = 1;

const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);
const round2 = (n) => Math.round(n * 100) / 100;
export const matches = (a, b) => Math.abs(num(a) - num(b)) <= TOLERANCE;

/**
 * How one charge's total is built: the rental (or overstay) amount, then whatever is added for the renter.
 * @param {object} charge — `ChargeRecord`
 * @returns {{ lines: { key: string, label: string, amount: number }[], sum: number, recorded: number, difference: number, ok: boolean }}
 */
export function chargeBuild(charge) {
  const lines = [
    { key: 'base', label: charge.chargeType === 'OVERSTAY' ? 'Overstay charge' : 'Rental', amount: num(charge.baseAmount) },
    { key: 'delivery', label: 'Delivery fee', amount: num(charge.deliveryFee) },
    { key: 'driver', label: 'Driver charge', amount: num(charge.driverCharge) },
    { key: 'processing', label: 'Processing fee', amount: num(charge.processingFee) },
  ].filter((l) => l.key === 'base' || l.amount !== 0);
  const sum = round2(lines.reduce((s, l) => s + l.amount, 0));
  const recorded = num(charge.totalCharged);
  return { lines, sum, recorded, difference: round2(recorded - sum), ok: matches(sum, recorded) };
}

/**
 * Where one charge's money went: the owner's share, the platform's commission, the processing fee, and the add-ons —
 * with whatever is left over (or missing) as its own line, so the parts always add back up to what was charged.
 * @param {object} charge — `ChargeRecord`
 * @returns {{ parts: { key: string, label: string, amount: number, share: number }[], total: number, unexplained: number }}
 */
export function allocation(charge) {
  const total = num(charge.totalCharged);
  const parts = [
    { key: 'owner', label: "Owner's share", amount: num(charge.ownerPayoutPromised) },
    { key: 'commission', label: 'Platform commission', amount: num(charge.platformCommission) },
    { key: 'processing', label: 'Processing fee', amount: num(charge.processingFee) },
    { key: 'delivery', label: 'Delivery fee', amount: num(charge.deliveryFee) },
    { key: 'driver', label: 'Driver charge', amount: num(charge.driverCharge) },
  ];
  const unexplained = round2(total - parts.reduce((s, p) => s + p.amount, 0));
  const all = Math.abs(unexplained) > TOLERANCE ? [...parts, { key: 'unexplained', label: unexplained > 0 ? 'Not accounted for' : 'Paid out more than charged', amount: unexplained }] : parts;
  return {
    parts: all.filter((p) => p.amount !== 0).map((p) => ({ ...p, share: total > 0 ? p.amount / total : 0 })),
    total,
    unexplained: Math.abs(unexplained) > TOLERANCE ? unexplained : 0,
  };
}

/**
 * The owner's share worked out from the rental: the rental less the commission — and, when the recorded share is more,
 * whether the difference is the driver charge and/or delivery fee being passed on to the owner.
 * @param {object} charge — `ChargeRecord`
 * @returns {{ expected: number, recorded: number, ok: boolean, note: string|null }}
 */
export function ownerShareCheck(charge) {
  const expected = round2(num(charge.baseAmount) - num(charge.platformCommission));
  const recorded = num(charge.ownerPayoutPromised);
  if (matches(expected, recorded)) return { expected, recorded, ok: true, note: null };
  const extra = round2(recorded - expected);
  const driver = num(charge.driverCharge);
  const delivery = num(charge.deliveryFee);
  const explained =
    (driver && matches(extra, driver) && 'the driver charge') ||
    (delivery && matches(extra, delivery) && 'the delivery fee') ||
    (driver && delivery && matches(extra, driver + delivery) && 'the driver charge and the delivery fee') ||
    null;
  return explained
    ? { expected: round2(expected + extra), recorded, ok: true, note: `Includes ${explained}, passed on to the owner.` }
    : { expected, recorded, ok: false, note: null };
}

/**
 * The commission rate that applies to a booking of `days` under the given settings, and what it comes to on `base`.
 * Uses the settings as they are now — a booking made before a change was priced at the rate of its day.
 * @param {number} base @param {number} days
 * @param {{ commissionRatePct?: number, multiDayCommissionRatePct?: number, multiDayThresholdDays?: number }} [settings]
 * @returns {{ ratePct: number|null, expected: number|null, rule: string }}
 */
export function commissionRule(base, days, settings) {
  if (!settings || settings.commissionRatePct == null) return { ratePct: null, expected: null, rule: 'Commission rate not available' };
  const longer = settings.multiDayCommissionRatePct != null && settings.multiDayThresholdDays != null && num(days) >= num(settings.multiDayThresholdDays);
  const ratePct = num(longer ? settings.multiDayCommissionRatePct : settings.commissionRatePct);
  return {
    ratePct,
    expected: round2((num(base) * ratePct) / 100),
    rule: longer ? `Longer-booking rate — ${num(days)} days is ${settings.multiDayThresholdDays} or more` : 'Standard rate',
  };
}

/**
 * The processing fee the settings would give: a flat M-Pesa fee for an M-Pesa payment, else the Pesapal percentage of
 * what was charged before the fee. Indicative only — the provider and the settings at the time decide.
 * @returns {{ expected: number|null, rule: string }}
 */
export function processingRule(charge, settings) {
  if (!settings) return { expected: null, rule: '' };
  const method = String(charge.paymentMethod || '').toUpperCase();
  if (method.includes('MPESA') || method.includes('M-PESA')) {
    return settings.mpesaStkFee == null ? { expected: null, rule: '' } : { expected: num(settings.mpesaStkFee), rule: 'M-Pesa flat fee' };
  }
  if (settings.pesapalTransactionFeeRatePct == null) return { expected: null, rule: '' };
  const before = num(charge.totalCharged) - num(charge.processingFee);
  return { expected: round2((before * num(settings.pesapalTransactionFeeRatePct)) / 100), rule: `Pesapal ${settings.pesapalTransactionFeeRatePct}% of ${Math.round(before).toLocaleString('en-KE')}` };
}

/**
 * The whole booking in one reconciliation: collected from the renter, less what's owed to the owner, less refunds — what
 * the platform keeps — set against the backend's own net profit for the booking.
 * @param {object} f — `BookingFinancialSummary`
 * @param {number} [refunded] — refunded to the renter (completed refunds)
 */
export function bookingReconciliation(f, refunded = 0) {
  const collected = num(f.totalCollectedFromRenter);
  const owner = num(f.totalOwnerPayoutsPromised);
  const kept = round2(collected - owner - num(refunded));
  const recordedNet = f.platformNetProfit == null ? null : num(f.platformNetProfit);
  return {
    billed: num(f.totalBilledToRenter),
    collected,
    unpaidByRenter: round2(num(f.totalBilledToRenter) - collected),
    owner,
    ownerPaid: num(f.totalOwnerPayoutsDisbursed),
    ownerOutstanding: num(f.totalOwnerPayoutsOutstanding),
    commission: num(f.totalPlatformCommission),
    processing: num(f.totalProcessingFees),
    refunded: num(refunded),
    kept,
    recordedNet,
    keptMatchesNet: recordedNet == null ? null : matches(kept, recordedNet),
  };
}

/** The booking's lines as CSV (one row per figure), for a spreadsheet. */
export function transactionCsv(f, refunded = 0) {
  const rows = [['Charge', 'Item', 'Amount (KES)']];
  (f.charges || []).forEach((c, i) => {
    const name = `${i + 1}. ${c.chargeType || 'Charge'}`;
    chargeBuild(c).lines.forEach((l) => rows.push([name, l.label, l.amount]));
    rows.push([name, 'Total charged', num(c.totalCharged)]);
    rows.push([name, 'Platform commission', num(c.platformCommission)]);
    rows.push([name, "Owner's share", num(c.ownerPayoutPromised)]);
    rows.push([name, 'Paid to owner', num(c.ownerPayoutDisbursed)]);
  });
  const r = bookingReconciliation(f, refunded);
  rows.push(['Booking', 'Collected from renter', r.collected], ['Booking', 'Owed to owner', r.owner], ['Booking', 'Refunded', r.refunded], ['Booking', 'Platform keeps', r.kept]);
  if (r.recordedNet != null) rows.push(['Booking', 'Platform net profit (recorded)', r.recordedNet]);
  const cell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  return rows.map((row) => row.map(cell).join(',')).join('\n');
}
