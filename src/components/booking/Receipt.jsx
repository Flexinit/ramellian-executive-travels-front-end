import React from 'react';
import { BadgeCheck } from 'lucide-react';
import Logo from '../ui/Logo';
import QrCode from '../ui/QrCode';
import { formatCurrency, formatDateRange, formatDateTime } from '../../lib/utils';
import { BOOKING_MODES, TRIP_TYPE_LABELS } from '../../lib/constants';

/** A string that's actually a link, for the backend's own `receipt` reference — shown as one only when it
 * looks like it; otherwise it's just printed as plain text (a receipt/confirmation number, most likely). */
function isUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

/**
 * The printable "paper" of a payment receipt — a letterhead (logo + wordmark), a line-item table of the
 * booking/vehicle/renter/payment details, the total actually paid, and a QR code of the booking reference
 * (generated client-side by `QrCode` — nothing about the booking is sent anywhere to render it) for a quick,
 * typo-free way to pull up the exact booking elsewhere, e.g. at a support desk. Deliberately shows only
 * `receipt.amount` (the total charged), never `platformFee`/`transactionFee`: a receipt is proof of what the
 * renter paid, not a breakdown of how the platform's commission is split out of the owner's own earnings
 * (see docs/backend-requests.md item 29 and the pinned rule behind it — the renter was never meant to see
 * that line item at all, receipt included).
 *
 * Every field shown is taken from `BookingResponse`/`VehicleResponse`/`PaymentStatusResponse` as confirmed
 * against the live OpenAPI spec (checked 2026-10-05) — `platformFee`/`transactionFee`/`ownerPayout` are the
 * only fields on those schemas deliberately left off, per the rule above; everything else relevant to what
 * was booked and paid for is included rather than just the handful shown before.
 *
 * **Amount Paid deliberately prefers the booking's own `estimatedAmount` over `PaymentStatusResponse.amount`
 * — confirmed live 2026-10-06 that they can disagree** (a renter reported paying more than the receipt
 * showed). `docs/backend-requests.md` item 29 already found `totalAmount` (what Pesapal actually collects)
 * equals `baseAmount + transactionFee`, not `baseAmount` alone; `PaymentStatusResponse.amount` looks to be
 * that bare `baseAmount`, understating what was really charged. `booking.estimatedAmount` is the same total
 * the renter was quoted and agreed to pay before checkout even started (the one `BookingRow`/
 * `BookingDetailPage` already trust for the same reason), so it's used here first; `receipt.amount` is only
 * a fallback for a booking that doesn't carry it.
 *
 * @param {object} booking — a `BookingResponse`
 * @param {object} [vehicle] — the matching `VehicleResponse`, for its model/registration (falls back to
 *   `booking.vehicleModel`/`vehicleId` when not loaded, same fallback `BookingRow` already uses)
 * @param {object} receipt — a *successful* `PaymentStatusResponse` (see `useBookingReceipt`)
 */
export default function Receipt({ booking, vehicle, receipt }) {
  const vehicleLabel = vehicle?.model || booking?.vehicleModel || booking?.vehicleId;
  const billedTo = [booking?.renterName, booking?.renterEmail].filter(Boolean).join(' · ');
  const amountPaid = booking?.totalPrice ?? booking?.estimatedAmount ?? receipt?.amount;

  const rows = [
    { label: 'Booking Reference', value: booking?.id },
    {
      label: 'Vehicle',
      value: vehicle?.registrationNumber ? `${vehicleLabel} (${vehicle.registrationNumber})` : vehicleLabel,
    },
    billedTo ? { label: 'Billed To', value: billedTo } : null,
    booking?.tripType ? { label: 'Trip Type', value: TRIP_TYPE_LABELS[booking.tripType] || booking.tripType } : null,
    booking?.bookingMode
      ? { label: 'Booking Mode', value: booking.bookingMode === BOOKING_MODES.CHAUFFEURED ? 'Chauffeured' : 'Self-Drive' }
      : null,
    { label: 'Trip Dates', value: formatDateRange(booking?.startTime, booking?.endTime) },
    booking?.pickupLocation ? { label: 'Pickup Location', value: booking.pickupLocation } : null,
    booking?.dropoffLocation ? { label: 'Drop-off Location', value: booking.dropoffLocation } : null,
    receipt?.provider ? { label: 'Payment Method', value: receipt.provider } : null,
    receipt?.orderTrackingId ? { label: 'Transaction Reference', value: receipt.orderTrackingId } : null,
    receipt?.receipt
      ? {
          label: 'Receipt No.',
          value: isUrl(receipt.receipt) ? (
            <a
              href={receipt.receipt}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-gold hover:text-brand-gold-light underline print:text-black"
            >
              View original
            </a>
          ) : (
            receipt.receipt
          ),
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5 text-sm print:text-black">
      {/* Letterhead */}
      <div className="flex flex-col items-center gap-3 pb-5 border-b border-white/10 print:border-black/20 text-center">
        <Logo size="lg" />
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-brand-grey print:text-black/60 text-[11px] font-semibold tracking-[0.2em] uppercase">
            Payment Receipt
          </p>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 print:border-black/30 print:bg-transparent print:text-black">
            <BadgeCheck size={13} aria-hidden="true" />
            Paid
          </span>
        </div>
      </div>

      {/* Line items */}
      <table className="w-full table-fixed border-collapse overflow-hidden rounded-xl border border-white/10 text-xs print:border-black/20">
        <tbody className="divide-y divide-white/10 print:divide-black/10">
          {rows.map((row, i) => (
            <tr key={row.label} className={i % 2 === 1 ? 'bg-white/[0.03] print:bg-black/[0.03]' : undefined}>
              <th
                scope="row"
                className="w-[38%] border-r border-white/10 px-3.5 py-2.5 text-left align-top font-medium text-brand-grey print:border-black/10 print:text-black/70"
              >
                {row.label}
              </th>
              <td className="px-3.5 py-2.5 text-left align-top font-medium text-brand-white print:text-black">
                <span className="block break-words">{row.value}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="flex items-center justify-between rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-3.5 print:border-black print:bg-transparent">
        <span className="text-brand-grey font-semibold print:text-black/70">Amount Paid</span>
        <span className="text-xl font-bold text-brand-white print:text-black">{formatCurrency(amountPaid)}</span>
      </div>

      {booking?.id && (
        <div className="flex flex-col items-center gap-2">
          <QrCode value={booking.id} />
          <p className="text-center text-[11px] text-brand-grey print:text-black/60">Scan for the booking reference</p>
        </div>
      )}

      <p className="text-center text-[11px] text-brand-grey print:text-black/60">
        Generated {formatDateTime(new Date())} · Thank you for choosing Ramellian Executive Travels.
      </p>
    </div>
  );
}
