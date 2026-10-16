import React from 'react';
import Card from '../ui/Card';
import PriceDisplay from '../ui/PriceDisplay';
import { quoteBreakdown } from '../../lib/quoteBreakdown';
import { formatCurrency } from '../../lib/utils';

function Lines({ lines }) {
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      {lines.map((line) => (
        <li key={line.label} className="flex justify-between gap-4">
          <span className="text-brand-grey">{line.label}</span>
          <span className="text-brand-white tabular-nums">{formatCurrency(line.amount)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The price of the whole selection, broken down so the renter can see what they're paying for: for each
 * vehicle, the rental (days × daily price) and any delivery, driver and payment processing fee, from the
 * backend's own quote (see `quoteBreakdown` — the platform's commission is never a line, it comes out of the
 * owner's payout). Several vehicles get a breakdown each, with its subtotal, then the grand total.
 *
 * A vehicle whose quote hasn't arrived (or failed) shows the client-side estimate (days × daily rate, every
 * started 24 hours counting as a day) until it does, and the total is labelled an estimate.
 *
 * @param {object[]} items — selection items (see cartStore)
 * @param {Record<string, object>} [quotes] — `POST /bookings/quote` results (`BookingQuoteResponse`), keyed by
 *   `vehicleId`
 */
export default function CartTotals({ items, quotes = {} }) {
  const breakdowns = items.map((item) => ({ item, ...quoteBreakdown(item, quotes[item.vehicleId]) }));
  const total = breakdowns.reduce((sum, b) => sum + b.total, 0);
  const estimated = breakdowns.some((b) => b.estimated);
  const several = items.length > 1;

  return (
    <Card className="p-5 flex flex-col gap-3" aria-label="Booking total">
      <h2 className="font-heading text-brand-white text-sm font-semibold">Price breakdown</h2>

      {several ? (
        <ul className="flex flex-col gap-3">
          {breakdowns.map(({ item, lines, total: subtotal }) => (
            <li key={item.vehicleId} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-4 text-sm font-medium">
                <span className="text-brand-white">{item.vehicle.model}</span>
                <span className="text-brand-white tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="pl-3 border-l border-white/10">
                <Lines lines={lines} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        breakdowns[0] && <Lines lines={breakdowns[0].lines} />
      )}

      <div aria-label="Total to pay" className="flex items-center justify-between pt-3 border-t border-white/10">
        <span className="text-brand-grey text-sm">
          {estimated ? 'Estimated total' : 'Total'}
          {several ? ` · ${items.length} vehicles` : ''}
        </span>
        <PriceDisplay amount={total} period="" size="lg" />
      </div>
      <p className="text-brand-grey text-xs">
        {estimated
          ? 'Worked out from the number of days. The final amount is confirmed when your booking is created.'
          : "This is what you'll pay. It's confirmed again when your booking is created."}
      </p>
    </Card>
  );
}
