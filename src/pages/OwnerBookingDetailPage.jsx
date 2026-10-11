import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { UserCog2, MessageSquare } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import BookingStatusBadge from '../components/booking/BookingStatusBadge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import ChauffeurAssignModal from '../components/booking/ChauffeurAssignModal';
import BookingStatusControl from '../components/booking/BookingStatusControl';
import ConfirmPaymentForm from '../components/booking/ConfirmPaymentForm';
import HandoverHistory from '../components/booking/HandoverHistory';
import ContractPdfActions from '../components/booking/ContractPdfActions';
import { useBooking } from '../hooks/useBookings';
import { useVehicle } from '../hooks/useVehicles';
import { formatDateRange, formatCurrency, calculateTotalPrice } from '../lib/utils';
import { stripPhoneNumbers } from '../lib/contactGuard';
import { sessionContractId } from '../lib/contracts';

export default function OwnerBookingDetailPage() {
  const { bookingId } = useParams();
  const { data: booking, isLoading, isError, error, refetch } = useBooking(bookingId);
  const { data: vehicle } = useVehicle(booking?.vehicleId);
  const [assigning, setAssigning] = useState(false);
  // `BookingResponse` has no `contractId` field (docs/backend-requests.md item 13) — this is only ever found
  // for a contract drafted earlier in this same browser session (an owner/admin who just stepped through
  // ContractPage themselves, or a renter's session on a shared device), same limitation BookingDetailPage's
  // own copy of this has. An owner/admin opening a booking they didn't personally just draft has no way to
  // find its contract id here until the backend adds one of the lookups that item asks for.
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

  return (
    <PageWrapper className="max-w-2xl">
      <PageTitle title="Booking Details" />
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-brand-white text-2xl font-bold">{vehicle?.model || 'Booking'}</h1>
            <p className="text-brand-grey text-sm mt-1">{formatDateRange(booking.startTime, booking.endTime)}</p>
          </div>
          <BookingStatusBadge status={booking.status} />
        </div>

        <Button to={`/messages/booking/${booking.id}`} className="self-start">
          <MessageSquare size={15} aria-hidden="true" />
          Message the renter
        </Button>

        <div className="bg-brand-navy border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-brand-grey">Booking Mode</span>
            <span className="text-brand-white">{booking.bookingMode || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-grey">Trip Type</span>
            <span className="text-brand-white">{booking.tripType || '—'}</span>
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
            <span className="text-brand-grey shrink-0">Renter Notes</span>
            <span className="text-brand-white text-right">{stripPhoneNumbers(booking.renterNotes).text || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-grey">Chauffeur</span>
            <span className="text-brand-white">{booking.chauffeurName || 'Not assigned'}</span>
          </div>
          <div className="flex justify-between text-sm pt-3 border-t border-white/10">
            <span className="text-brand-grey">Total</span>
            <span className="text-brand-white font-semibold">{formatCurrency(total)}</span>
          </div>
        </div>

        {booking.bookingMode === 'CHAUFFEURED' && (
          <Button className="self-start" onClick={() => setAssigning(true)}>
            <UserCog2 size={15} aria-hidden="true" />
            {booking.chauffeurName ? 'Reassign Chauffeur' : 'Assign Chauffeur'}
          </Button>
        )}

        <BookingStatusControl booking={booking} />
        <ConfirmPaymentForm booking={booking} />

        <HandoverHistory bookingId={booking.id} />

        {contractId && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-brand-white">Contract</h2>
            <div className="flex gap-4">
              <ContractPdfActions contractId={contractId} signed={false} label="Unsigned PDF" />
              <ContractPdfActions contractId={contractId} signed label="Signed PDF" />
            </div>
          </div>
        )}
      </div>

      <ChauffeurAssignModal
        isOpen={assigning}
        onClose={() => setAssigning(false)}
        bookingId={booking.id}
        currentChauffeur={booking.chauffeurName}
      />
    </PageWrapper>
  );
}
