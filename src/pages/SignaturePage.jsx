import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { PenLine, ArrowRight } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import BackLink from '../components/ui/BackLink';
import ContractConfirmBar from '../components/contract/ContractConfirmBar';
import ContractSigningPlace from '../components/contract/ContractSigningPlace';
import ContractPageLayout from '../components/contract/ContractPageLayout';
import { routeFromBooking } from '../lib/tripRoute';
import { useRenterName } from '../hooks/useRenterName';
import ContractViewer from '../components/payment/ContractViewer';
import BookingUnavailableNotice from '../components/booking/BookingUnavailableNotice';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useBooking } from '../hooks/useBookings';
import { useContract, useSignContract, renterSignedAt, ownerSignedAt } from '../hooks/useContract';
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
const SIGNATURES_ID = 'contract-signatures';

export default function SignaturePage() {
  const { vehicleId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const bookingId = location.state?.bookingId || sessionStorage.getItem(`booking:${vehicleId}`);
  // "I have read and understood this agreement" comes first; only then does the signature pad appear, in the
  // renter's place in the contract's Signatures section, and "Sign" takes them straight there.
  const [confirmedRead, setConfirmedRead] = useState(false);
  // Read part by part; the confirmation (and so the signature pad) only comes once the last part is reached.
  const [readToEnd, setReadToEnd] = useState(false);
  // A group moves on to the next booking's contract on this same page: that one is read and confirmed afresh.
  useEffect(() => {
    setConfirmedRead(false);
    setReadToEnd(false);
  }, [bookingId]);
  function goToSignature() {
    const section = document.getElementById(SIGNATURES_ID);
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    section?.querySelector('canvas')?.focus?.();
  }

  const { data: booking, isLoading: bookingLoading, isError: bookingError } = useBooking(bookingId, { staleTime: 0 });
  const contractId = sessionContractId(bookingId) || booking?.contractId;
  const { data: contract, isLoading: contractLoading, isError: contractError } = useContract(contractId);
  // The template's {{fields}} filled in with this booking's details — the same as on the review page.
  const contractText = useFilledContract(bookingId, contract?.contractText, contract?.acceptedAt);
  const signContract = useSignContract();
  const renterName = useRenterName(booking);
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
    <PageWrapper className="max-w-[80rem] mx-auto">
      <PageTitle title="Sign Contract" />
      {/* Already paid by now — back shows the payment and its receipt, not a way to pay again. */}
      <ContractPageLayout
        back={<BackLink to={`/book/${vehicleId}/payment`} state={{ bookingId }} label="Back to payment" />}
        title="Sign Your Contract"
        intro="Read it part by part with Next. On the last part, confirm you have read it, then sign."
      >

        {unfulfilled && <BookingUnavailableNotice booking={booking} />}

        {!unfulfilled && (
          <>
            <ContractViewer
              key={bookingId}
              contractText={contractText}
              pdfUrl={contract.pdfUrl}
              document={{
                reference: bookingId,
                route: routeFromBooking(booking || {}),
                agreementDate: contract.acceptedAt || contract.reviewedAt,
                renter: { name: renterName, signedAt: renterSignedAt(contract), signedBy: contract.renterSignedBy },
                owner: { name: contract.ownerSignedBy, signedAt: ownerSignedAt(contract) },
                signaturesId: SIGNATURES_ID,
                staged: true,
                onProgress: ({ atEnd }) => atEnd && setReadToEnd(true),
                renterSigning: confirmedRead ? (
                  <ContractSigningPlace
                    offerSave
                    signing={signContract.isPending}
                    error={signContract.isError ? signContract.error : null}
                    onSign={(opts) => signContract.mutate({ contractId, bookingId, ...opts })}
                  />
                ) : (
                  <p className="mt-2 text-[12.5px] text-slate-500">
                    Tick "I have read and understood this agreement" below, then sign here.
                  </p>
                ),
              }}
            />

            {/* Already signed (signed earlier, or the page was reloaded): say so, and go on from here. */}
            {renterSignedAt(contract) && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <p className="text-sm text-ink">This contract is signed. You can go on to the next step.</p>
                <Button size="lg" onClick={() => goOnAfterSigning(bookingId, navigate)} className="shrink-0">
                  Continue <ArrowRight size={16} aria-hidden="true" />
                </Button>
              </div>
            )}

            {!renterSignedAt(contract) && readToEnd && (
              <ContractConfirmBar confirmed={confirmedRead} onConfirmedChange={setConfirmedRead} onAction={goToSignature}>
                <PenLine size={16} aria-hidden="true" /> Sign
              </ContractConfirmBar>
            )}
          </>
        )}
      </ContractPageLayout>
    </PageWrapper>
  );
}
