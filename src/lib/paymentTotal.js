/**
 * What the renter actually pays for a booking, by how they pay — the same arithmetic the backend charges (backend,
 * 2026-10-27): the rental, plus delivery and driver if any, plus the processing fee of the payment method:
 *  - M-Pesa (a prompt, or a split): the flat M-Pesa payment (STK) fee plus the payout (B2C) fee, from Platform Settings;
 *  - Card & other (Pesapal): the Pesapal transaction fee, a percentage of the rest.
 * The commission is not on top: it comes out of the owner's share.
 *
 * Before this, the Payment page showed the rental alone as "Total due" (e.g. KES 1), while the M-Pesa prompt asked for
 * the whole charge (KES 84 = 1 + 33 + 50).
 *
 * @param {object} [booking] — `BookingResponse` (`baseAmount`, `deliveryFee`, `driverCharge`, `numberOfDays`)
 * @param {object} [vehicle] — for `dailyPrice`, when the booking doesn't give its rental amount
 * @param {object} [settings] — `PlatformSettingsResponse`
 * @param {'mpesa'|'split'|'pesapal'} method
 * @returns {{ lines: { key: string, label: string, amount: number, note?: string }[], total: number }}
 */
export function amountToPay(booking, vehicle, settings, method) {
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const days = n(booking?.numberOfDays);
  const daily = n(vehicle?.dailyPrice);
  const rental = booking?.baseAmount != null ? n(booking.baseAmount) : daily && days ? daily * days : n(booking?.estimatedAmount);
  const lines = [
    {
      key: 'rental',
      label: 'Rental',
      amount: rental,
      note: daily && days && Math.abs(daily * days - rental) < 1 ? `${formatKes(daily)} a day × ${days} day${days === 1 ? '' : 's'}` : undefined,
    },
    { key: 'delivery', label: 'Delivery', amount: n(booking?.deliveryFee) },
    { key: 'driver', label: 'Driver', amount: n(booking?.driverCharge) },
  ].filter((l) => l.key === 'rental' || l.amount > 0);
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);

  // One "Processing fee" line whichever way they pay (product owner, 2026-11-04) — for M-Pesa the payment and transfer
  // fees together, for card & other the Pesapal percentage.
  // A fee switched off in Platform Settings (`…Enabled: false`, live spec 2026-11-04) isn't charged.
  const on = (flag) => settings?.[flag] !== false;
  const processing = method === 'pesapal'
    ? (on('pesapalTransactionFeeEnabled') ? Math.round(subtotal * n(settings?.pesapalTransactionFeeRatePct)) / 100 : 0)
    : (on('mpesaStkFeeEnabled') ? n(settings?.mpesaStkFee) : 0) + (on('mpesaB2cFeeEnabled') ? n(settings?.mpesaB2cFee) : 0);
  if (processing > 0) lines.push({ key: 'processing', label: 'Processing fee', amount: processing });
  const total = Math.round(lines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  return { lines, total };
}

function formatKes(n) {
  return `KES ${Math.round(n).toLocaleString('en-KE')}`;
}
