import React, { useState } from 'react';
import { ChevronDown, MessageSquare, PenLine, KeyRound, FlagOff, CalendarClock, CreditCard } from 'lucide-react';
import Button from '../ui/Button';
import AuthImage from '../vehicles/AuthImage';
import GenericVehiclePlaceholder from '../vehicles/GenericVehiclePlaceholder';
import ContractPdfActions from './ContractPdfActions';
import ReceiptActions from './ReceiptActions';
import BookingStatusBadge from './BookingStatusBadge';
import CancelBookingModal from './CancelBookingModal';
import PostponeBookingModal from './PostponeBookingModal';
import { useOverstayCheckout } from '../../hooks/usePayment';
import VehicleHandoverModal from './VehicleHandoverModal';
import HandoverHistory from './HandoverHistory';
import { useVehicle } from '../../hooks/useVehicles';
import { sessionContractId } from '../../lib/contracts';
import { stripPhoneNumbers } from '../../lib/contactGuard';
import { TRIP_TYPE_LABELS, BOOKING_MODES, BOOKING_STATUSES } from '../../lib/constants';
import { formatDateRange, formatDateTime, formatTime, formatDate, formatCurrency, calculateTotalPrice, canRecordPickup as pickupDateReached } from '../../lib/utils';

const RENTER_BASE_PATH = '/dashboard/bookings';

/**
 * One row in BookingTable — vehicle, dates, status, cost, and a "View
 * Details" toggle. Clicking the row, pressing Enter on it, or clicking the
 * button expands a details panel in place (no navigation to another page):
 * exact pickup/drop-off times, duration, mode, trip type, chauffeur,
 * overstay, notes, a booking reference, and — fetched from the vehicle once
 * expanded, since the booking itself doesn't carry them — its pickup
 * location, registration number and (for a renter) the owner's email. Also
 * shows Unsigned/Signed PDF download links when this browser
 * session has the contract's id (stashed by `useContractDraft` — see
 * `lib/contracts.js`; `BookingResponse` itself has no `contractId` field),
 * same as BookingDetailPage's own Contract section, plus the actions that
 * make sense
 * for whoever's looking — a renter gets "Message the owner", "Record Pickup" once
 * Confirmed or "Record Return" once Active (the backend only accepts handover
 * details from the renter — see docs/backend-requests.md item 22's follow-up),
 * and, while the booking is still Pending or Confirmed, "Cancel booking", plus
 * (same session, same contract-id limitation as the PDF links) "Sign contract"
 * to get back to the signature pad if they left before signing; an owner or
 * admin gets "Message the renter" only — changing a booking's status by hand
 * still goes through BookingStatusControl on the full booking page, not from here.
 * `basePath` (which picks the message-link wording and whether Cancel shows)
 * also lets the same row work for the renter's, owner's, or admin's booking
 * list. An optional `actionLabel`/`onAction` renders a trailing action
 * button (e.g. "Assign" on the owner's table) without affecting the toggle.
 *
 * On a phone the row shows as a card (BookingTable's `stack-table`): each cell names its own column through
 * `data-label`, since the table's header row is hidden there.
 *
 * The vehicle is now fetched as soon as the row renders, not only once expanded — the collapsed row
 * itself shows its photo and registration number (the real backend's `BookingResponse` carries neither;
 * `booking.vehicleModel`/`vehicleId` was the only thing ever shown there before, which is a raw UUID for
 * every booking that didn't happen to arrive with a `vehicleModel` already attached). `useVehicle` caches
 * by id, so a table where several rows share the same vehicle only fetches it once regardless.
 *
 * @param {boolean} [showContract] — adds a trailing Contract column with Download links, same
 *   session/`sessionContractId` limitation as the expanded detail panel's own copy of this — only for My
 *   Bookings, where it's actually useful (a renter checking they have their copy); not offered on the
 *   owner's or admin's table, who never drafted the contract in this browser to begin with.
 * @param {boolean} [showReceipt] — adds a trailing Receipt column (Preview/Download, see ReceiptActions) —
 *   unlike Contract, this has no same-session limitation (it's looked up from the backend's own payment
 *   status, not something only this browser happened to stash), so it's offered on every bookings table.
 */
export default function BookingRow({ booking, basePath = RENTER_BASE_PATH, actionLabel, onAction, showContract = false, showReceipt = false }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [movingDates, setMovingDates] = useState(false);
  const overstay = useOverstayCheckout();
  // Which handover modal is open, if either — mirrors BookingDetailPage's own version of this, so a renter
  // can record a pickup or return straight from the list without opening the booking's full page.
  const [handover, setHandover] = useState(null);
  const { data: vehicle } = useVehicle(booking.vehicleId);

  const total = booking.totalPrice ?? booking.estimatedAmount ?? calculateTotalPrice(booking.dailyPrice, booking.numberOfDays);
  const isRenterView = basePath === RENTER_BASE_PATH;
  const canCancel = isRenterView && ['PENDING', 'CONFIRMED'].includes(booking.status);
  // The backend only accepts handover details from the renter (a 403 "Only the renter can submit handover
  // details" otherwise) — this used to be offered on the owner/admin view instead, which could never work.
  const canRecordPickup = isRenterView && booking.status === BOOKING_STATUSES.CONFIRMED;
  // Confirmed alone isn't enough — the trip's own start date has to have actually arrived too, so a pickup
  // can't be recorded days ahead of the real handover (see `canRecordPickup`'s own doc comment in lib/utils.js).
  const pickupReady = canRecordPickup && pickupDateReached(booking);
  const canRecordReturn = isRenterView && booking.status === BOOKING_STATUSES.ACTIVE;
  const chauffeur = booking.chauffeurEmail || booking.chauffeurName;
  const hasOverstay = booking.overstayDays > 0 || booking.overstayAmount > 0;
  const dispatcherNotes = stripPhoneNumbers(booking.dispatcherNotes).text;
  const renterNotes = stripPhoneNumbers(booking.renterNotes).text;
  // A booking only ever reaches these statuses once it's actually been paid for — skips the lookup entirely
  // (rather than a doomed-to-404 request per row) for Pending/Cancelled/Rejected/Expired.
  const everPaid = [BOOKING_STATUSES.CONFIRMED, BOOKING_STATUSES.ACTIVE, BOOKING_STATUSES.COMPLETED].includes(booking.status);
  const detailColSpan = 4 + (onAction ? 1 : 0) + (showContract ? 1 : 0) + (showReceipt ? 1 : 0) + 1;
  const contractId = sessionContractId(booking.id);
  const photo = vehicle?.photos?.[0];
  const photoUrl = typeof photo === 'string' ? photo : photo?.url;
  // A renter who left the flow after paying but before signing (closed the tab, switched device) has no
  // other way back to the signature pad — `BookingResponse` doesn't expose whether it's been signed, or its
  // contract's id, outside this same browser session (see docs/backend-requests.md item 13), so this can
  // only ever work for the session that drafted it, same limitation the PDF download links above already
  // have. Gated the same way `canCancel` is: no point offering it once the booking is done or gone.
  const canResumeSigning = isRenterView && !!contractId && ['PENDING', 'CONFIRMED'].includes(booking.status);

  function toggle() {
    setExpanded((v) => !v);
  }

  return (
    <>
      <tr
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter') toggle();
        }}
        aria-expanded={expanded}
        className="cursor-pointer hover:bg-white/5 transition-colors focus-ring"
      >
        <td className="stack-full px-4 py-3 text-sm text-brand-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-9 rounded-lg overflow-hidden shrink-0 bg-white/5">
              {photoUrl ? (
                <AuthImage
                  src={photoUrl}
                  alt={vehicle?.model || booking.vehicleModel || ''}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  fallback={<GenericVehiclePlaceholder tier={vehicle?.tier} />}
                />
              ) : (
                <GenericVehiclePlaceholder tier={vehicle?.tier} />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate">{vehicle?.model || booking.vehicleModel || 'Vehicle'}</div>
              {(vehicle?.registrationNumber || booking.vehicleId) && (
                <div className="text-xs text-brand-grey/70 truncate">{vehicle?.registrationNumber || booking.vehicleId}</div>
              )}
            </div>
          </div>
        </td>
        <td data-label="Dates" className="px-4 py-3 text-sm text-brand-grey">
          <div>{formatDateRange(booking.startTime, booking.endTime)}</div>
          <div className="text-xs text-brand-grey/70">
            {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
          </div>
        </td>
        <td className="stack-end px-4 py-3">
          <BookingStatusBadge status={booking.status} />
        </td>
        <td data-label="Cost" className="px-4 py-3 text-sm text-brand-white text-right">{formatCurrency(total)}</td>
        {showContract && (
          <td data-label="Contract" className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
            {contractId ? (
              <ContractPdfActions contractId={contractId} signed label="Signed PDF" />
            ) : (
              <span className="text-brand-grey text-sm">—</span>
            )}
          </td>
        )}
        {showReceipt && (
          <td data-label="Receipt" className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
            {everPaid ? <ReceiptActions booking={booking} vehicle={vehicle} /> : <span className="text-brand-grey text-sm">—</span>}
          </td>
        )}
        {onAction && (
          <td data-label="Chauffeur" className="px-4 py-3 text-right">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAction(booking);
              }}
            >
              {actionLabel}
            </Button>
          </td>
        )}
        <td className="stack-full px-4 py-3 text-right">
          <Button size="sm" onClick={(e) => { e.stopPropagation(); toggle(); }}>
            {expanded ? 'Hide' : 'View'} Details
            <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </Button>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-white/[0.03]">
          <td colSpan={detailColSpan} className="px-4 py-5">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-brand-grey shrink-0">Booking Reference</dt>
                <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">{booking.id}</dd>
              </div>
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-brand-grey shrink-0">Vehicle</dt>
                <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">{vehicle?.model || booking.vehicleModel || booking.vehicleId}</dd>
              </div>
              {vehicle?.location && (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-brand-grey shrink-0">Location</dt>
                  <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">{vehicle.location}</dd>
                </div>
              )}
              {vehicle?.registrationNumber && (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-brand-grey shrink-0">Registration</dt>
                  <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">{vehicle.registrationNumber}</dd>
                </div>
              )}
              {isRenterView && vehicle?.ownerEmail && (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-brand-grey shrink-0">Owner</dt>
                  <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">{vehicle.ownerEmail}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-brand-grey shrink-0">Pickup</dt>
                <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">{formatDateTime(booking.startTime)}</dd>
              </div>
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-brand-grey shrink-0">Drop-off</dt>
                <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">{formatDateTime(booking.endTime)}</dd>
              </div>
              {booking.pickupLocation && (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-brand-grey shrink-0">Pickup Location</dt>
                  <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">{booking.pickupLocation}</dd>
                </div>
              )}
              {booking.dropoffLocation && (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-brand-grey shrink-0">Drop-off Location</dt>
                  <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">{booking.dropoffLocation}</dd>
                </div>
              )}
              {booking.numberOfDays != null && (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-brand-grey shrink-0">Duration</dt>
                  <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">
                    {booking.numberOfDays} {booking.numberOfDays === 1 ? 'day' : 'days'}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-brand-grey shrink-0">Mode</dt>
                <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">
                  {booking.bookingMode === BOOKING_MODES.CHAUFFEURED ? 'Chauffeured' : 'Self-Drive'}
                </dd>
              </div>
              {booking.tripType && (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-brand-grey shrink-0">Trip Type</dt>
                  <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">{TRIP_TYPE_LABELS[booking.tripType] || booking.tripType}</dd>
                </div>
              )}
              {booking.bookingMode === BOOKING_MODES.CHAUFFEURED && (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-brand-grey shrink-0">Chauffeur</dt>
                  <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">{chauffeur || 'Not assigned'}</dd>
                </div>
              )}
              {!isRenterView && booking.renterEmail && (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-brand-grey shrink-0">Renter</dt>
                  <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">{booking.renterEmail}</dd>
                </div>
              )}
              {hasOverstay && (
                <div className="flex justify-between gap-4 sm:block">
                  <dt className="text-brand-grey shrink-0">Overstay</dt>
                  <dd className="text-brand-white text-right sm:text-left sm:mt-0.5">
                    {booking.overstayDays ?? 0} {booking.overstayDays === 1 ? 'day' : 'days'}
                    {booking.overstayAmount ? ` · ${formatCurrency(booking.overstayAmount)}` : ''}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-brand-grey shrink-0">Total</dt>
                <dd className="text-brand-white text-right sm:text-left sm:mt-0.5 font-semibold">{formatCurrency(total)}</dd>
              </div>
              {renterNotes && (
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <dt className="text-brand-grey">Notes</dt>
                  <dd className="text-brand-white">{renterNotes}</dd>
                </div>
              )}
              {dispatcherNotes && (
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <dt className="text-brand-grey">Owner's Note</dt>
                  <dd className="text-brand-white">{dispatcherNotes}</dd>
                </div>
              )}
            </dl>

            {contractId && (
              <div className="flex flex-col gap-1.5 mt-5">
                <span className="text-brand-grey text-sm">Contract</span>
                <div className="flex gap-4">
                  <ContractPdfActions contractId={contractId} signed={false} label="Unsigned PDF" />
                  <ContractPdfActions contractId={contractId} signed label="Signed PDF" />
                </div>
              </div>
            )}

            {everPaid && (
              <div className="flex flex-col gap-1.5 mt-5">
                <span className="text-brand-grey text-sm">Receipt</span>
                <ReceiptActions booking={booking} vehicle={vehicle} />
              </div>
            )}

            <div className="mt-5">
              <HandoverHistory bookingId={booking.id} />
            </div>

            <div className="flex gap-3 mt-5 flex-wrap">
              {canResumeSigning && (
                <Button
                  size="sm"
                  to={`/book/${booking.vehicleId}/sign`}
                  state={{ bookingId: booking.id }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <PenLine size={14} aria-hidden="true" />
                  Sign contract
                </Button>
              )}
              <Button size="sm" to={`/messages/booking/${booking.id}`} onClick={(e) => e.stopPropagation()}>
                <MessageSquare size={14} aria-hidden="true" />
                {isRenterView ? 'Message the owner' : 'Message the renter'}
              </Button>
              {isRenterView && Number(booking.overstayAmount) > 0 && (
                <Button size="sm" loading={overstay.isPending} onClick={(e) => { e.stopPropagation(); overstay.mutate(booking.id); }}>
                  {!overstay.isPending && <CreditCard size={14} aria-hidden="true" />} Pay overstay {formatCurrency(booking.overstayAmount)}
                </Button>
              )}
              {canCancel && (
                <Button size="sm" onClick={(e) => { e.stopPropagation(); setMovingDates(true); }}>
                  <CalendarClock size={14} aria-hidden="true" /> Move dates
                </Button>
              )}
              {canCancel && (
                <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setConfirmingCancel(true); }}>
                  Cancel booking
                </Button>
              )}
              {canRecordPickup && (
                <div className="flex flex-col gap-1 items-start">
                  <Button
                    size="sm"
                    disabled={!pickupReady}
                    onClick={(e) => { e.stopPropagation(); setHandover('pickup'); }}
                  >
                    <KeyRound size={14} aria-hidden="true" />
                    Record Pickup
                  </Button>
                  {!pickupReady && (
                    <span className="text-brand-grey text-[11px]">From {formatDate(booking.startTime)}</span>
                  )}
                </div>
              )}
              {canRecordReturn && (
                <Button size="sm" onClick={(e) => { e.stopPropagation(); setHandover('return'); }}>
                  <FlagOff size={14} aria-hidden="true" />
                  Record Return
                </Button>
              )}
            </div>

            <CancelBookingModal isOpen={confirmingCancel} onClose={() => setConfirmingCancel(false)} booking={booking} />
            <PostponeBookingModal isOpen={movingDates} onClose={() => setMovingDates(false)} booking={booking} />
            <VehicleHandoverModal
              isOpen={!!handover}
              onClose={() => setHandover(null)}
              bookingId={booking.id}
              type={handover || 'pickup'}
            />
          </td>
        </tr>
      )}
    </>
  );
}
