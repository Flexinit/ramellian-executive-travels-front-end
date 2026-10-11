import React from 'react';
import Card from '../ui/Card';
import PriceDisplay from '../ui/PriceDisplay';
import { cartTotal, lineTotal } from '../../lib/cart';
import { formatCurrency } from '../../lib/utils';

/**
 * The price of the whole selection: one line per vehicle and the estimated total. It is an estimate
 * (days × daily rate, every started 24 hours counting as a day) unless the backend's own quote for that
 * vehicle is given, in which case that figure is used instead.
 * @param {object[]} items — selection items (see cartStore)
 * @param {Record<string, {totalAmount?: number}>} [quotes] — `POST /bookings/quote` results, keyed by
 *   `vehicleId`; a vehicle with no entry falls back to the client-side estimate. `BookingQuoteResponse`'s
 *   total (base price plus platform fee) — confirmed live 2026-10-03, replacing the field this used to be
 *   called (`estimatedAmount`, which the backend dropped from this response; `BookingResponse` itself, a
 *   created booking's own record, still has `estimatedAmount` unchanged).
 */
export default function CartTotals({ items, quotes = {} }) {
  const amountFor = (item) => quotes[item.vehicleId]?.totalAmount ?? lineTotal(item);
  const total = items.reduce((sum, item) => sum + amountFor(item), 0);

  return (
    <Card className="p-5 flex flex-col gap-3" aria-label="Booking total">
      {items.length > 1 && (
        <ul className="flex flex-col gap-2 text-sm">
          {items.map((item) => (
            <li key={item.vehicleId} className="flex justify-between gap-4">
              <span className="text-brand-grey">{item.vehicle.model}</span>
              <span className="text-brand-white">{formatCurrency(amountFor(item))}</span>
            </li>
          ))}
        </ul>
      )}
      <div className={`flex items-center justify-between ${items.length > 1 ? 'pt-3 border-t border-white/10' : ''}`}>
        <span className="text-brand-grey text-sm">
          Estimated total{items.length > 1 ? ` · ${items.length} vehicles` : ''}
        </span>
        <PriceDisplay amount={total} period="" size="lg" />
      </div>
      <p className="text-brand-grey text-xs">
        Worked out from the number of days. The final amount is confirmed when your booking is created.
      </p>
    </Card>
  );
}
