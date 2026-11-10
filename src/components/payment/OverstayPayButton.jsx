import React, { useState } from 'react';
import { CheckCircle2, Clock, CreditCard } from 'lucide-react';
import Button from '../ui/Button';
import OverstayPaymentModal from './OverstayPaymentModal';
import { useOverstayStatus } from '../../hooks/usePayment';
import { PAYMENT_STATUSES } from '../../lib/constants';
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
 * (BookingRow) and the booking's own page: opens the overstay payment dialog (OverstayPaymentModal — M-Pesa prompt or
 * Pesapal).
 *
 * The overstay status (`GET /payments/mpesa/bookings/{id}/overstay/status`, live spec 2026-11-10) says when it's been
 * paid: SUCCESSFUL shows **Overstay paid**, PENDING "being confirmed". A Pesapal payment just finished here also shows as
 * "being confirmed" for that same amount until the status catches up — a second click would be a second charge — with
 * **Pay again** for one that didn't go through. A different amount (the charge changed) asks again.
 *
 * @param {object} booking @param {'sm'|'md'} [size] @param {string} [className]
 */
export default function OverstayPayButton({ booking, size = 'sm', className = '' }) {
  const [open, setOpen] = useState(false);
  const amount = String(booking.overstayAmount ?? '');
  const [paidAmount, setPaidAmount] = useState(() => readPaid(booking.id));
  const status = useOverstayStatus(booking.id).data?.status;

  function start(e) {
    e?.stopPropagation();
    setOpen(true);
  }

  function paid() {
    try {
      sessionStorage.setItem(paidKey(booking.id), amount);
    } catch {
      // Without storage the button simply stays as it was.
    }
    setPaidAmount(amount);
  }

  // The dialog stays in one place whichever state the button shows, so a status change while paying (PENDING, then
  // SUCCESSFUL) never remounts it mid-payment.
  let content;
  if (status === PAYMENT_STATUSES.SUCCESSFUL) {
    content = (
      <span className={`inline-flex items-center gap-2 text-sm text-muted ${className}`} role="status">
        <CheckCircle2 size={14} className="text-emerald-600" aria-hidden="true" /> Overstay paid
      </span>
    );
  } else if (status === PAYMENT_STATUSES.PENDING || paidAmount === amount) {
    content = (
      <span className={`inline-flex flex-wrap items-center gap-2 text-sm text-muted ${className}`} role="status">
        <Clock size={14} className="text-amber-600" aria-hidden="true" /> Overstay payment being confirmed
        <button type="button" onClick={start} className="text-accent hover:underline focus-ring rounded">
          Didn&apos;t go through? Pay again
        </button>
      </span>
    );
  } else {
    content = (
      <Button size={size} className={className} onClick={start}>
        <CreditCard size={size === 'sm' ? 14 : 15} aria-hidden="true" /> Pay overstay {formatCurrency(booking.overstayAmount)}
      </Button>
    );
  }

  return (
    <>
      {content}
      <OverstayPaymentModal isOpen={open} booking={booking} onClose={() => setOpen(false)} onPaid={paid} />
    </>
  );
}
