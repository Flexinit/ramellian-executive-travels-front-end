import React, { useState } from 'react';
import { Clock, CreditCard } from 'lucide-react';
import Button from '../ui/Button';
import OverstayPaymentModal from './OverstayPaymentModal';
import { useOverstayCheckout } from '../../hooks/usePayment';
import { formatCurrency } from '../../lib/utils';

const paidKey = (bookingId) => `overstay-paid:${bookingId}`;

function readPaid(bookingId) {
  try {
    return sessionStorage.getItem(paidKey(bookingId));
  } catch {
    return null;
  }
}

/**
 * **Pay overstay** for a booking returned late (`BookingResponse.overstayAmount`), shared by the bookings list
 * (BookingRow) and the booking's own page: starts the overstay checkout and pays it in a dialog (OverstayPaymentModal).
 *
 * There's no status for an overstay payment and no "paid" field on the booking (live spec 2026-11-05), so once a payment
 * has been finished here the button gives way to "being confirmed" for that same amount — a second click would be a
 * second charge — with **Pay again** for one that didn't go through. A different amount (the charge changed) asks again.
 *
 * @param {object} booking @param {'sm'|'md'} [size] @param {string} [className]
 */
export default function OverstayPayButton({ booking, size = 'sm', className = '' }) {
  const overstay = useOverstayCheckout();
  const [url, setUrl] = useState(null);
  const amount = String(booking.overstayAmount ?? '');
  const [paidAmount, setPaidAmount] = useState(() => readPaid(booking.id));

  function start(e) {
    e?.stopPropagation();
    overstay.mutate(booking.id, { onSuccess: (data) => setUrl(data?.redirectUrl || null) });
  }

  function paid() {
    try {
      sessionStorage.setItem(paidKey(booking.id), amount);
    } catch {
      // Without storage the button simply stays as it was.
    }
    setPaidAmount(amount);
  }

  const modal = <OverstayPaymentModal url={url} booking={booking} onClose={() => setUrl(null)} onPaid={paid} />;

  if (paidAmount === amount) {
    return (
      <span className={`inline-flex flex-wrap items-center gap-2 text-sm text-muted ${className}`} role="status">
        <Clock size={14} className="text-amber-600" aria-hidden="true" /> Overstay payment being confirmed
        <button
          type="button"
          onClick={start}
          disabled={overstay.isPending}
          className="text-accent hover:underline focus-ring rounded disabled:opacity-60"
        >
          {overstay.isPending ? 'Starting…' : "Didn't go through? Pay again"}
        </button>
        {modal}
      </span>
    );
  }

  return (
    <>
      <Button size={size} className={className} loading={overstay.isPending} onClick={start}>
        {!overstay.isPending && <CreditCard size={size === 'sm' ? 14 : 15} aria-hidden="true" />} Pay overstay {formatCurrency(booking.overstayAmount)}
      </Button>
      {modal}
    </>
  );
}
