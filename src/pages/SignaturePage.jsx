import React, { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import ContractViewer from '../components/payment/ContractViewer';
import SignaturePad from '../components/payment/SignaturePad';
import BookingUnavailableNotice from '../components/booking/BookingUnavailableNotice';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useBooking } from '../hooks/useBookings';
import { useContract, useSignContract } from '../hooks/useContract';
import { useFilledContract } from '../hooks/useFilledContract';
import { sessionContractId } from '../lib/contracts';
import { isBookingUnfulfilled } from '../lib/utils';

/**
 * Renders the (now-paid) contract plus a signature pad. `contractId` comes from sessionStorage
 * (`contract:${bookingId}`, stashed by `useContractDraft` when the contract was first drafted) — the
 * live backend's `BookingResponse` has no `contractId` field (confirmed against the swagger spec; the
 * `booking?.contractId` this used to read was always `undefined`, which made this page permanently
 * unreachable — see docs/backend-requests.md item 13), so the booking record itself can't supply it.
 */
export default function SignaturePage() {
  const { vehicleId } = useParams();
  const location = useLocation();
  const bookingId = location.state?.bookingId || sessionStorage.getItem(`booking:${vehicleId}`);
  const [signature, setSignature] = useState(null);

  const { data: booking, isLoading: bookingLoading, isError: bookingError } = useBooking(bookingId, { staleTime: 0 });
  const contractId = sessionContractId(bookingId) || booking?.contractId;
  const { data: contract, isLoading: contractLoading, isError: contractError } = useContract(contractId);
  // The template's {{fields}} filled in with this booking's details — the same as on the review page.
  const contractText = useFilledContract(bookingId, contract?.contractText);
  const signContract = useSignContract();
  const unfulfilled = isBookingUnfulfilled(booking?.status);

  if (!bookingId) {
    return (
      <PageWrapper className="max-w-lg mx-auto min-h-[60vh] flex items-center justify-center">
        <ErrorBanner message="We couldn't find which booking this contract is for." />
      </PageWrapper>
    );
  }

  if (bookingLoading || (contractId && contractLoading)) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" label="Loading contract" />
      </PageWrapper>
    );
  }

  if (bookingError || contractError || !contract) {
    return (
      <PageWrapper>
        <ErrorBanner message="Could not load your contract." />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="max-w-2xl mx-auto">
      <PageTitle title="Sign Contract" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-brand-white text-2xl font-bold">Sign Your Contract</h1>
          <p className="text-brand-grey text-sm mt-1">Review the terms once more, then sign below to confirm.</p>
        </div>

        {unfulfilled && <BookingUnavailableNotice booking={booking} />}

        {!unfulfilled && (
          <>
            <ContractViewer contractText={contractText} pdfUrl={contract.pdfUrl} />

            <SignaturePad onChange={setSignature} />

            <Button
              size="lg"
              disabled={!signature}
              loading={signContract.isPending}
              onClick={() => signContract.mutate({ contractId, signature, bookingId })}
            >
              {!signContract.isPending && <Check size={16} aria-hidden="true" />} Submit Signature
            </Button>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
