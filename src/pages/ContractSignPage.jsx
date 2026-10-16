import React, { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import BackLink from '../components/ui/BackLink';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import OwnerContractSigning from '../components/contract/OwnerContractSigning';
import { useContract } from '../hooks/useContract';
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
 */
export default function ContractSignPage() {
  const { contractId } = useParams();
  const me = useAuthStore((s) => s.user);
  const contract = useContract(contractId);
  const bookingId = contract.data?.bookingId;
  const booking = useBooking(bookingId);

  useEffect(() => {
    if (bookingId && contractId) stashContractId(bookingId, contractId);
  }, [bookingId, contractId]);

  if (contract.isLoading || (bookingId && booking.isLoading)) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" label="Loading the contract" />
      </PageWrapper>
    );
  }
  if (contract.isError || !contract.data) {
    return (
      <PageWrapper className="max-w-lg mx-auto">
        <ErrorBanner message={apiErrorMessage(contract.error, 'Could not open this contract.')} />
      </PageWrapper>
    );
  }

  const b = booking.data;
  const isRenter = b?.renterEmail && me?.email && b.renterEmail.toLowerCase() === me.email.toLowerCase();
  if (isRenter) return <Navigate to={`/book/${bookingId}/sign`} state={{ bookingId }} replace />;

  return (
    <PageWrapper className="max-w-3xl mx-auto">
      <PageTitle title="Sign Contract" />
      <div className="flex flex-col gap-6">
        {bookingId && <BackLink to={`/owner/bookings/${bookingId}`} label="View booking" />}
        <div>
          <h1 className="font-heading text-brand-white text-2xl font-bold">Sign the rental contract</h1>
          <p className="text-brand-grey text-sm mt-1.5">
            {b ? `${b.renterName || 'The renter'} · ${formatDateRange(b.startTime, b.endTime)}. ` : ''}
            Read it part by part, confirm you have read it, then sign as the owner.
          </p>
        </div>
        <OwnerContractSigning contractId={contractId} booking={b} />
      </div>
    </PageWrapper>
  );
}
