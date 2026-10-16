import { billableDays, lineTotal } from './cart';
import { formatCurrency } from './utils';

const cents = (n) => Math.round(Number(n || 0) * 100) / 100;

/**
 * What a renter pays for one vehicle, line by line, from the backend's own quote (`POST /bookings/quote` →
 * `BookingQuoteResponse`) — so checkout can show why the total is what it is.
 *
 * Only charges the renter actually pays are listed: the rental (days × daily price), delivery, a driver, and the
 * payment processing fee — each only when it's above zero. The platform's commission (`platformFee`) is never a
 * line: it comes out of the owner's payout, not the renter's price (product rule; live 2026-10-16 `totalAmount`
 * = `baseAmount + transactionFee`, `platformFee` not added). The lines always add up to `totalAmount`, the
 * amount actually charged: if the backend's total ever includes something not broken out, the difference is
 * shown as "Other charges" rather than leaving the sum short.
 *
 * Without a quote yet (loading, or it failed) it falls back to the client-side estimate: one rental line.
 *
 * @param {object} item — a selection item (cartStore): vehicle.dailyPrice, startTime, endTime
 * @param {object} [quote] — the vehicle's `BookingQuoteResponse`
 * @returns {{ lines: Array<{ label: string, amount: number }>, total: number, estimated: boolean }}
 */
export function quoteBreakdown(item, quote) {
  if (!quote || quote.totalAmount == null) {
    const days = billableDays(item?.startTime, item?.endTime);
    const rate = Number(item?.vehicle?.dailyPrice);
    const total = lineTotal(item);
    const label = Number.isFinite(rate) && days > 0 ? `${days} day${days === 1 ? '' : 's'} × ${formatCurrency(rate)}` : 'Rental';
    return { lines: [{ label, amount: total }], total, estimated: true };
  }

  const days = Number(quote.numberOfDays);
  const rate = Number(quote.pricePerDay);
  const lines = [
    {
      label: Number.isFinite(days) && Number.isFinite(rate) ? `${days} day${days === 1 ? '' : 's'} × ${formatCurrency(rate)}` : 'Rental',
      amount: cents(quote.baseAmount),
    },
  ];
  if (cents(quote.deliveryFee) > 0) lines.push({ label: 'Delivery', amount: cents(quote.deliveryFee) });
  if (cents(quote.driverCharge) > 0) lines.push({ label: 'Driver', amount: cents(quote.driverCharge) });
  if (cents(quote.transactionFee) > 0) lines.push({ label: 'Payment processing fee', amount: cents(quote.transactionFee) });

  const total = cents(quote.totalAmount);
  const rest = cents(total - lines.reduce((sum, l) => sum + l.amount, 0));
  if (rest > 0) lines.push({ label: 'Other charges', amount: rest });
  return { lines, total, estimated: false };
}
