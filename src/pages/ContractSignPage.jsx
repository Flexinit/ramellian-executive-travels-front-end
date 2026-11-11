import React, { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import BackLink from '../components/ui/BackLink';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import OwnerContractSigning from '../components/contract/OwnerContractSigning';
import { useContract, useBookingContract } from '../hooks/useContract';
import { useBooking } from '../hooks/useBookings';
import { useAuthStore } from '../store/authStore';
import { stashContractId } from '../lib/contracts';
import { formatDateRange } from '../lib/utils';
import { apiErrorMessage } from '../lib/apiError';

/**
 * Where a "please sign the contract" notification lands (`/contracts/:contractId/sign` — the backend sends one to
 * the owner, its `referenceId` the contract). It loads the contract and its booking, remembers the pair (so the
 * booking's own page can offer signing too — `BookingResponse` has no `contractId`, docs/backend-requests.md item
 * 13), and shows the owner's **Read & sign**. If the person signed in is the booking's renter instead, it sends them
 * to the renter's signing page.
 *
 * A sign request that refers to a booking lands here with the booking's id (notificationLink): when the id isn't a
 * contract it is read as a booking, and its contract is looked up by booking (`useBookingContract`).
 */
export default function ContractSignPage() {
  const { contractId: idInAddress } = useParams();
  const me = useAuthStore((s) => s.user);
  const asContract = useContract(idInAddress, { retry: false });
  // Not a contract: perhaps a booking, whose contract is looked up by booking.
  const asBooking = useBooking(idInAddress, { enabled: !!idInAddress && asContract.isError, retry: false });
  const byBooking = useBookingContract(idInAddress, { enabled: !!asBooking.data });
  const foundId = asBooking.data ? byBooking.contractId : null;
  const found = useContract(foundId);
  const contract = asContract.data ? asContract : found;
  const contractId = asContract.data ? idInAddress : foundId;
  const bookingId = contract.data?.bookingId || (asBooking.data ? idInAddress : undefined);
  const booking = useBooking(bookingId);

  useEffect(() => {
    if (bookingId && contractId) stashContractId(bookingId, contractId);
  }, [bookingId, contractId]);

  if (asContract.isLoading || asBooking.isLoading || byBooking.isLoading || (foundId && found.isLoading) || (bookingId && booking.isLoading)) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" label="Loading the contract" />
      </PageWrapper>
    );
  }

  const b = booking.data;
  const isRenter = b?.renterEmail && me?.email && b.renterEmail.toLowerCase() === me.email.toLowerCase();
  if (isRenter) return <Navigate to={`/book/${bookingId}/sign`} state={{ bookingId }} replace />;

  // A booking the backend has no contract for (not drafted yet), or won't show to this account.
  if (b && !contract.data) {
    return (
      <PageWrapper className="max-w-lg mx-auto min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <PageTitle title="Sign Contract" />
        <h1 className="font-heading text-ink text-xl font-bold">No contract to sign yet</h1>
        <p className="text-muted text-sm">
          {b.renterName || 'The renter'} · {formatDateRange(b.startTime, b.endTime)}. This booking doesn&apos;t have a
          contract you can sign yet.
        </p>
        <BackLink to={`/owner/bookings/${bookingId}`} label="View booking" />
      </PageWrapper>
    );
  }

  if (!contract.data) {
    return (
      <PageWrapper className="max-w-lg mx-auto">
        <ErrorBanner message={apiErrorMessage(asContract.error, 'Could not open this contract.')} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="max-w-3xl mx-auto">
      <PageTitle title="Sign Contract" />
      <div className="flex flex-col gap-6">
        {bookingId && <BackLink to={`/owner/bookings/${bookingId}`} label="View booking" />}
        <div>
          <h1 className="font-heading text-ink text-2xl font-bold">Sign the rental contract</h1>
          <p className="text-muted text-sm mt-1.5">
            {b ? `${b.renterName || 'The renter'} · ${formatDateRange(b.startTime, b.endTime)}. ` : ''}
            Read it part by part, confirm you have read it, then sign as the owner.
          </p>
        </div>
        <OwnerContractSigning contractId={contractId} booking={b} />
      </div>
    </PageWrapper>
  );
}
