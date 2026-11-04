import React from 'react';
import Card from '../ui/Card';
import PriceDisplay from '../ui/PriceDisplay';
import { formatDateRange, calculateTotalPrice, formatCurrency } from '../../lib/utils';

const money = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? formatCurrency(v) : `KES ${v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * The booking being paid for, and what it costs — itemised for the way the renter is paying (`breakdown`, from
 * lib/paymentTotal.js: the rental, delivery and driver if any, and that method's fees), so the total here is exactly
 * what the M-Pesa prompt or Pesapal will ask for.
 *
 * @param {object} booking — { startTime, endTime, numberOfDays }
 * @param {object} vehicle — { model, dailyPrice }
 * @param {{ lines: { key: string, label: string, amount: number, note?: string }[], total: number }} [breakdown]
 * @param {number} [paidAmount] — once paid: what was actually paid, from the payment record
 */
export default function PaymentSummary({ booking, vehicle, paid = false, className = '', breakdown, paidAmount }) {
  const total = paid && paidAmount != null ? Number(paidAmount) : breakdown ? breakdown.total : calculateTotalPrice(vehicle?.dailyPrice, booking?.numberOfDays);
  const lines = !paid && breakdown?.lines?.length > 1 ? breakdown.lines : [];

  return (
    <Card className={`p-4 flex flex-col gap-3 ${className}`}>
      <div>
        <h3 className="font-heading text-ink font-semibold">{vehicle?.model}</h3>
        {booking?.startTime && booking?.endTime && (
          <p className="text-muted text-xs mt-1">{formatDateRange(booking.startTime, booking.endTime)}</p>
        )}
      </div>
      {lines.length > 0 && (
        <dl className="pt-3 border-t border-ink/10 flex flex-col gap-1.5 text-sm" aria-label="What you pay">
          {lines.map((l) => (
            <div key={l.key} className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">
                {l.label}
                {l.note && <span className="block text-xs">{l.note}</span>}
              </dt>
              <dd className="text-ink tabular-nums">{money(l.amount)}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="pt-3 border-t border-ink/10 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-muted text-sm">{paid ? 'Total Paid' : lines.length > 0 ? 'Total to pay' : 'Total Due'}</span>
        <PriceDisplay amount={total} period="" size="md" />
      </div>
    </Card>
  );
}
