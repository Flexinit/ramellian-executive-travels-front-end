import React from 'react';
import AuthImage from '../vehicles/AuthImage';
import Card from '../ui/Card';
import GenericVehiclePlaceholder from '../vehicles/GenericVehiclePlaceholder';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { billableDays } from '../../lib/cart';
import { TRIP_TYPE_LABELS, BOOKING_MODES } from '../../lib/constants';

/**
 * One vehicle of a booking: what, when, how, and its own daily rate. Every place this is used (the basket,
 * checkout, a group payment) also shows a `CartTotals` alongside it, which is the one place the estimated
 * total (per vehicle and overall) is shown — repeating it on every card as well was pure vertical space
 * spent saying the same number twice, which is exactly what made these pages feel like nothing but scrolling.
 *
 * @param {object} vehicle — at least `model`, `dailyPrice`, `photos`, `tier`
 * @param {object} draft — `{ startTime, endTime, bookingMode, tripType, renterNotes, pickupLocation, dropoffLocation }`
 * @param {React.ReactNode} [actions] — buttons shown at the top right (Edit / Remove…)
 * @param {React.ReactNode} [note] — a message shown under the details (e.g. why it can't be booked)
 * @param {{numberOfDays?: number, totalAmount?: number, deliveryFee?: number}} [quote] — the backend's own price quote
 *   (`POST /bookings/quote`), shown instead of the client-side guess when given; omit to keep the guess.
 */
export default function BookingSummaryCard({ vehicle, draft, actions, note, quote }) {
  const { startTime, endTime, bookingMode, tripType, renterNotes, pickupLocation, dropoffLocation, deliveryRequested, tripOrigin, tripDestination } = draft;
  const deliveryFee = quote?.deliveryFee;
  const days = quote?.numberOfDays ?? billableDays(startTime, endTime);
  const photo = vehicle?.photos?.[0];
  const photoUrl = typeof photo === 'string' ? photo : photo?.url;

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-white/5">
          {photoUrl ? (
            <AuthImage
              src={photoUrl}
              alt={vehicle.model}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              fallback={<GenericVehiclePlaceholder tier={vehicle?.tier} />}
            />
          ) : (
            <GenericVehiclePlaceholder tier={vehicle?.tier} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-brand-white font-semibold">{vehicle?.model}</h3>
          <p className="text-brand-grey text-xs">
            {bookingMode === BOOKING_MODES.CHAUFFEURED ? 'Chauffeured' : 'Self-Drive'}
          </p>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      <dl className="flex flex-col gap-2.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-brand-grey shrink-0">Dates</dt>
          <dd className="text-brand-white text-right">
            {/* The exact pickup/return time matters here, not just the day — a trip's start time can lapse
                into the past while it sits in the cart (see BookingCheckoutPage's stale-date check), and a
                bare date wouldn't show why. */}
            {startTime && endTime ? `${formatDateTime(startTime)} – ${formatDateTime(endTime)}` : '—'}
          </dd>
        </div>
        {(tripOrigin || tripDestination) && (
          <div className="flex justify-between gap-4">
            <dt className="text-brand-grey shrink-0">Route</dt>
            <dd className="text-brand-white text-right">{tripOrigin || '—'} → {tripDestination || '—'}</dd>
          </div>
        )}
        {tripType && (
          <div className="flex justify-between gap-4">
            <dt className="text-brand-grey shrink-0">Trip Type</dt>
            <dd className="text-brand-white text-right">{TRIP_TYPE_LABELS[tripType] || tripType}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-brand-grey shrink-0">Getting the vehicle</dt>
          <dd className="text-brand-white text-right">
            {deliveryRequested
              ? `Delivered to you${deliveryFee > 0 ? ` — ${formatCurrency(deliveryFee)} fee` : ''}`
              : 'You collect it — no fee'}
          </dd>
        </div>
        {pickupLocation && (
          <div className="flex justify-between gap-4">
            <dt className="text-brand-grey shrink-0">{deliveryRequested ? 'Delivery Address' : 'Pickup Location'}</dt>
            <dd className="text-brand-white text-right">{pickupLocation}</dd>
          </div>
        )}
        {dropoffLocation && (
          <div className="flex justify-between gap-4">
            <dt className="text-brand-grey shrink-0">Drop-off Location</dt>
            <dd className="text-brand-white text-right">{dropoffLocation}</dd>
          </div>
        )}
        {renterNotes && (
          <div className="flex flex-col gap-1">
            <dt className="text-brand-grey">Notes</dt>
            <dd className="text-brand-white">{renterNotes}</dd>
          </div>
        )}
        {days > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-brand-grey shrink-0">Price</dt>
            <dd className="text-brand-white text-right">
              {days} {days === 1 ? 'day' : 'days'} × {formatCurrency(vehicle?.dailyPrice)}
            </dd>
          </div>
        )}
      </dl>

      {note}
    </Card>
  );
}
