import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageSquare, Mail, KeyRound, FlagOff, CalendarClock, CreditCard } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import BackLink from '../components/ui/BackLink';
import BookingStatusBadge from '../components/booking/BookingStatusBadge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useBooking } from '../hooks/useBookings';
import CancelBookingModal from '../components/booking/CancelBookingModal';
import PostponeBookingModal from '../components/booking/PostponeBookingModal';
import { useOverstayCheckout } from '../hooks/usePayment';
import ReviewForm from '../components/reviews/ReviewForm';
import BookingUnavailableNotice from '../components/booking/BookingUnavailableNotice';
import ContractPdfActions from '../components/booking/ContractPdfActions';
import ReceiptActions from '../components/booking/ReceiptActions';
import HandoverHistory from '../components/booking/HandoverHistory';
import VehicleHandoverModal from '../components/booking/VehicleHandoverModal';
import { useVehicle } from '../hooks/useVehicles';
import AuthImage from '../components/vehicles/AuthImage';
import GenericVehiclePlaceholder from '../components/vehicles/GenericVehiclePlaceholder';
import { sessionContractId } from '../lib/contracts';
import { formatDateRange, formatDate, formatCurrency, calculateTotalPrice, isBookingUnfulfilled, canRecordPickup } from '../lib/utils';
import { stripPhoneNumbers } from '../lib/contactGuard';
import { TRIP_TYPE_LABELS, BOOKING_STATUSES } from '../lib/constants';
import Button from '../components/ui/Button';

export default function BookingDetailPage() {
  const { bookingId } = useParams();
  const { data: booking, isLoading, isError, error, refetch } = useBooking(bookingId);
  const { data: vehicle } = useVehicle(booking?.vehicleId);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [movingDates, setMovingDates] = useState(false);
  const overstay = useOverstayCheckout();
  // Which handover modal is open, if either — 'pickup' once the booking's confirmed and waiting to be
  // collected, 'return' once it's out (ACTIVE) and due back. Never both: a booking is only ever in one of
  // those states at a time. The backend only accepts handover details from the renter (a 403 "Only the
  // renter can submit handover details" otherwise), which is why this lives here and not on the owner's
  // equivalent page — see docs/backend-requests.md item 22's follow-up.
  const [handover, setHandover] = useState(null);
  // Opened straight off a just-recorded return, instead of only ever waiting for `canReview` below (which
  // needs a refetch of the booking to see its status flip to COMPLETED) — the trip just ended, so this is
  // the moment to actually ask.
  const [justReturned, setJustReturned] = useState(false);
  // `BookingResponse` has no `contractId` field (see useContract.js's useContractDraft) — this is only
  // ever found for a contract drafted earlier in this same browser session (sessionStorage doesn't
  // survive a closed tab), so an older booking's contract has no download links here. There's no backend
  // endpoint to look one up by booking id instead — see docs/backend-requests.md item 13.
  const contractId = sessionContractId(bookingId) || booking?.contractId;

  if (isLoading) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" label="Loading booking" />
      </PageWrapper>
    );
  }

  if (isError || !booking) {
    return (
      <PageWrapper>
        <ErrorBanner
          message={error?.response?.data?.message || 'Could not load this booking.'}
          onRetry={refetch}
        />
      </PageWrapper>
    );
  }

  const total = booking.totalPrice ?? booking.estimatedAmount ?? calculateTotalPrice(vehicle?.dailyPrice, booking.numberOfDays);
  const canCancel = ['PENDING', 'CONFIRMED'].includes(booking.status);
  const canReview = booking.status === 'COMPLETED';
  const everPaid = [BOOKING_STATUSES.CONFIRMED, BOOKING_STATUSES.ACTIVE, BOOKING_STATUSES.COMPLETED].includes(booking.status);
  const pickupDateReached = canRecordPickup(booking);

  const photo = vehicle?.photos?.[0];
  const photoUrl = typeof photo === 'string' ? photo : photo?.url;

  return (
    <PageWrapper className="max-w-2xl">
      <PageTitle title="Booking Details" />
      <div className="flex flex-col gap-6">
        <BackLink to="/dashboard/bookings" label="Back to My Bookings" />
        <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
          <div className="flex items-center gap-4 min-w-0 max-w-full">
            <div className="w-20 h-16 rounded-xl overflow-hidden shrink-0 bg-white/5">
              {photoUrl ? (
                <AuthImage
                  src={photoUrl}
                  alt={vehicle?.model || 'Vehicle'}
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
              <h1 className="font-heading text-brand-white text-2xl font-bold sm:truncate">{vehicle?.model || 'Booking'}</h1>
              <p className="text-brand-grey text-sm mt-1">{formatDateRange(booking.startTime, booking.endTime)}</p>
            </div>
          </div>
          <BookingStatusBadge status={booking.status} className="shrink-0" />
        </div>

        {isBookingUnfulfilled(booking.status) ? (
          <BookingUnavailableNotice booking={booking} />
        ) : (
          <Button to={`/messages/booking/${booking.id}`} className="self-start">
            <MessageSquare size={15} aria-hidden="true" />
            Message the owner
          </Button>
        )}

        <div className="bg-brand-navy border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
          {vehicle?.ownerEmail && (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-brand-grey shrink-0">Owner</span>
              <span className="text-brand-white text-right inline-flex items-start gap-1.5 min-w-0 break-all">
                <Mail size={13} className="text-brand-grey shrink-0 mt-[3px]" aria-hidden="true" />
                {vehicle.ownerEmail}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-brand-grey">Trip Type</span>
            <span className="text-brand-white">{booking.tripType ? TRIP_TYPE_LABELS[booking.tripType] || booking.tripType : '—'}</span>
          </div>
          {booking.pickupLocation && (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-brand-grey shrink-0">Pickup Location</span>
              <span className="text-brand-white text-right">{booking.pickupLocation}</span>
            </div>
          )}
          {booking.dropoffLocation && (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-brand-grey shrink-0">Drop-off Location</span>
              <span className="text-brand-white text-right">{booking.dropoffLocation}</span>
            </div>
          )}
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-brand-grey shrink-0">Notes</span>
            <span className="text-brand-white text-right">{stripPhoneNumbers(booking.renterNotes).text || '—'}</span>
          </div>
          <div className="flex justify-between text-sm pt-3 border-t border-white/10">
            <span className="text-brand-grey">Total</span>
            <span className="text-brand-white font-semibold">{formatCurrency(total)}</span>
          </div>
        </div>

        {Number(booking.overstayAmount) > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm text-brand-white">
              Returned late{booking.overstayDays ? ` by ${booking.overstayDays} day${booking.overstayDays === 1 ? '' : 's'}` : ''}: an
              overstay charge of <span className="font-semibold">{formatCurrency(booking.overstayAmount)}</span> is due.
            </p>
            <Button className="shrink-0" loading={overstay.isPending} onClick={() => overstay.mutate(booking.id)}>
              {!overstay.isPending && <CreditCard size={15} aria-hidden="true" />} Pay overstay
            </Button>
          </div>
        )}

        {canCancel && (
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setMovingDates(true)}>
              <CalendarClock size={15} aria-hidden="true" /> Move dates
            </Button>
            <Button variant="danger" onClick={() => setConfirmingCancel(true)}>
              Cancel booking
            </Button>
          </div>
        )}

        {booking.status === BOOKING_STATUSES.CONFIRMED && (
          <div className="flex flex-col gap-1.5 items-start">
            <Button className="self-start" disabled={!pickupDateReached} onClick={() => setHandover('pickup')}>
              <KeyRound size={15} aria-hidden="true" />
              Record Pickup
            </Button>
            {!pickupDateReached && (
              <p className="text-brand-grey text-xs">
                You can record this once your trip starts, on {formatDate(booking.startTime)}.
              </p>
            )}
          </div>
        )}

        {booking.status === BOOKING_STATUSES.ACTIVE && (
          <Button className="self-start" onClick={() => setHandover('return')}>
            <FlagOff size={15} aria-hidden="true" />
            Record Return
          </Button>
        )}

        <HandoverHistory bookingId={booking.id} />

        {canReview && (
          <section aria-labelledby="review-heading" className="bg-brand-navy border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
            <h2 id="review-heading" className="font-heading text-brand-white text-base font-semibold">
              How was your trip?
            </h2>
            <ReviewForm bookingId={booking.id} />
          </section>
        )}

        {contractId && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-brand-white">Contract</h2>
            <div className="flex gap-4">
              <ContractPdfActions contractId={contractId} signed={false} label="Unsigned PDF" />
              <ContractPdfActions contractId={contractId} signed label="Signed PDF" />
            </div>
          </div>
        )}

        {everPaid && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-brand-white">Receipt</h2>
            <ReceiptActions booking={booking} vehicle={vehicle} />
          </div>
        )}
      </div>

      <CancelBookingModal isOpen={confirmingCancel} onClose={() => setConfirmingCancel(false)} booking={booking} />
      <PostponeBookingModal isOpen={movingDates} onClose={() => setMovingDates(false)} booking={booking} />

      <VehicleHandoverModal
        isOpen={!!handover}
        onClose={() => setHandover(null)}
        bookingId={booking.id}
        type={handover || 'pickup'}
        onRecorded={handover === 'return' ? () => setJustReturned(true) : undefined}
      />

      <Modal isOpen={justReturned} onClose={() => setJustReturned(false)} title="How was your trip?" size="sm">
        <ReviewForm bookingId={booking.id} onSent={() => setJustReturned(false)} />
      </Modal>
    </PageWrapper>
  );
}
