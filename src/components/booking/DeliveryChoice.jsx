import React from 'react';
import SegmentedControl from '../ui/SegmentedControl';
import { useBookingStore } from '../../store/bookingStore';
import { useBookingQuote } from '../../hooks/useBooking';
import { formatCurrency } from '../../lib/utils';

/**
 * How the renter gets the vehicle: they collect it themselves (no fee), or it's delivered to them for the
 * platform's flat delivery fee (`deliveryFlatFee`, set by an admin in Platform Settings). The fee shown is the
 * backend's own figure — a quote for these dates with `deliveryRequested` — so it is exactly what the booking
 * will charge; before dates are chosen there's nothing to quote yet, so it just says a fee applies. Kept small
 * (a compact toggle and a one-line note) so it shares a row in the booking panel.
 *
 * @param {object} vehicle — normalised vehicle
 */
export default function DeliveryChoice({ vehicle }) {
  const draft = useBookingStore((s) => s.draft);
  const setDraft = useBookingStore((s) => s.setDraft);
  const quote = useBookingQuote({
    vehicleId: vehicle.id,
    startTime: draft.startTime,
    endTime: draft.endTime,
    deliveryRequested: true,
    bookingMode: draft.bookingMode,
  });
  const fee = quote.data?.deliveryFee;
  const feeText = fee == null ? 'Delivery fee applies' : fee > 0 ? `${formatCurrency(fee)} delivery fee` : 'Free delivery';

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">Getting the vehicle</span>
      <SegmentedControl
        label="How will you get the vehicle?"
        options={[
          { value: 'collect', label: "I'll collect" },
          { value: 'deliver', label: 'Deliver' },
        ]}
        value={draft.deliveryRequested ? 'deliver' : 'collect'}
        onChange={(value) => setDraft({ deliveryRequested: value === 'deliver' })}
        size="sm"
      />
      <p className="text-xs text-muted" aria-live="polite">
        {draft.deliveryRequested ? `${feeText}, added to your total.` : 'No fee — you collect it yourself.'}
      </p>
    </div>
  );
}
