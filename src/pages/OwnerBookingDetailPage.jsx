import React, { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { UserCog2, MessageSquare, Repeat } from 'lucide-react';
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
import ReviewForm from '../components/reviews/ReviewForm';
import OwnerContractSigning from '../components/contract/OwnerContractSigning';
import Card from '../components/ui/Card';
import { useBooking } from '../hooks/useBookings';
import { useVehicle } from '../hooks/useVehicles';
import { formatDateRange, formatCurrency, calculateTotalPrice } from '../lib/utils';
import { stripPhoneNumbers } from '../lib/contactGuard';
import { sessionContractId } from '../lib/contracts';
import { DetailList, DetailRow } from '../components/ui/DetailList';
import ChangeVehicleModal, { canChangeVehicle } from '../components/booking/ChangeVehicleModal';
import BookingPayoutCard from '../components/admin/BookingPayoutCard';

export default function OwnerBookingDetailPage() {
  const { bookingId } = useParams();
  const { data: booking, isLoading, isError, error, refetch } = useBooking(bookingId);
  const { data: vehicle } = useVehicle(booking?.vehicleId);
  const [assigning, setAssigning] = useState(false);
  const [changingVehicle, setChangingVehicle] = useState(false);
  // Shared by the owner (Fleet Bookings) and the Admin Panel (All Bookings): an administrator may switch to any car.
  const vehicleScope = useLocation().pathname.startsWith('/admin') ? 'admin' : 'owner';
  // Rating the renter, once the trip is over (POST /reviews/bookings/{id}/renter). Hidden once sent.
  const [renterReviewed, setRenterReviewed] = useState(false);
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
        <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="font-heading text-ink text-2xl font-bold">{vehicle?.model || 'Booking'}</h1>
            <p className="text-muted text-sm mt-1">{formatDateRange(booking.startTime, booking.endTime)}</p>
          </div>
          <BookingStatusBadge status={booking.status} className="shrink-0" />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button to={`/messages/booking/${booking.id}`}>
            <MessageSquare size={15} aria-hidden="true" />
            Message the renter
          </Button>
          {canChangeVehicle(booking) && (
            <Button variant="outline" onClick={() => setChangingVehicle(true)}>
              <Repeat size={15} aria-hidden="true" />
              Change vehicle
            </Button>
          )}
        </div>
        <ChangeVehicleModal booking={booking} scope={vehicleScope} isOpen={changingVehicle} onClose={() => setChangingVehicle(false)} />

        <Card className="p-5">
          <DetailList>
            <DetailRow label="Booking Mode">{booking.bookingMode || '—'}</DetailRow>
            <DetailRow label="Trip Type">{booking.tripType || '—'}</DetailRow>
            <DetailRow label="Pickup Location" hidden={!booking.pickupLocation}>{booking.pickupLocation}</DetailRow>
            <DetailRow label="Drop-off Location" hidden={!booking.dropoffLocation}>{booking.dropoffLocation}</DetailRow>
            <DetailRow label="Renter Notes">{stripPhoneNumbers(booking.renterNotes).text || '—'}</DetailRow>
            <DetailRow label="Chauffeur">{booking.chauffeurName || 'Not assigned'}</DetailRow>
            <DetailRow label="Total" divider valueClassName="font-semibold">{formatCurrency(total)}</DetailRow>
          </DetailList>
        </Card>

        {booking.bookingMode === 'CHAUFFEURED' && (
          <Button className="self-start" onClick={() => setAssigning(true)}>
            <UserCog2 size={15} aria-hidden="true" />
            {booking.chauffeurName ? 'Reassign Chauffeur' : 'Assign Chauffeur'}
          </Button>
        )}

        <BookingStatusControl booking={booking} />
        <ConfirmPaymentForm booking={booking} />

        <HandoverHistory bookingId={booking.id} />

        {/* Administrators: the owner's payout for this booking — paid from here once pickup is recorded. */}
        {vehicleScope === 'admin' && <BookingPayoutCard booking={booking} />}

        {booking.status === 'COMPLETED' && !renterReviewed && (
          <Card className="p-5 flex flex-col gap-3">
            <div>
              <h2 className="font-heading text-ink text-base font-semibold">Rate the renter</h2>
              <p className="text-muted text-sm mt-1">
                How was {booking.renterName || 'this renter'}? It helps other owners decide on future bookings.
              </p>
            </div>
            <ReviewForm bookingId={booking.id} target="renter" onSent={() => setRenterReviewed(true)} />
          </Card>
        )}

        {contractId && <OwnerContractSigning contractId={contractId} booking={booking} />}

        {contractId && (
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-ink">Contract</h2>
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
