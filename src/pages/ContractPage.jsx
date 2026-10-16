import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import BackLink from '../components/ui/BackLink';
import ContractConfirmBar from '../components/contract/ContractConfirmBar';
import ContractPageLayout from '../components/contract/ContractPageLayout';
import { useRenterName } from '../hooks/useRenterName';
import { RotateCcw, Trash2, Car, CreditCard, CheckCircle2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import ContractViewer from '../components/payment/ContractViewer';
import BookingUnavailableNotice from '../components/booking/BookingUnavailableNotice';
import BookingWarningsModal from '../components/documents/BookingWarningsModal';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useContractDraft, useAcceptContract, renterSignedAt, ownerSignedAt } from '../hooks/useContract';
import { useBooking } from '../hooks/useBookings';
import { useFilledContract } from '../hooks/useFilledContract';
import { useCartStore } from '../store/cartStore';
import { isBookingUnfulfilled } from '../lib/utils';

// The backend's own wording when a contract draft is requested for a booking that isn't (or no longer is)
// pending — most often because this page is revisited for a booking whose contract was already accepted
// (the browser's Back button, or a stale link/bookmark). Matched loosely (case-insensitive "pending") rather
// than pinned to the exact sentence, since the backend owns that copy and could reword it.
//
// Also matches "duplicate key"/"already exists": drafting isn't idempotent on the backend today — re-drafting
// for a booking that already has one doesn't return the existing contract, it tries to INSERT a second row
// and crashes on `booking_contract`'s own unique constraint on `booking_id` (a raw 500 with the Postgres/Spring
// exception's full text as the message — see docs/backend-requests.md item 19). It's the exact same "already
// taken care of" situation "pending" catches, just surfaced as a database error instead of a clean one, so it
// gets the same friendly treatment here rather than showing that raw stack trace.
const ALREADY_HANDLED_HINT = /pending|duplicate key|already exists/i;

/**
 * Auto-requests the contract draft on mount (per docs/menu-structure.md
 * §9, `/book/*` gets minimal chrome — just the logo, no Navbar/Footer).
 * `bookingId` comes from navigation state set by `useCreateBooking` on
 * success; a direct/refreshed visit without it can't know which booking
 * to draft a contract for, so it shows a recovery link instead of
 * guessing.
 *
 * If this booking was cancelled (self-cancelled, not `unfulfilled` — see
 * BookingUnavailableNotice, which covers the owner declining it or the hold
 * expiring) and still matches an item in the cart, it's stuck there too, so
 * this offers **Try booking again** (a fresh booking for the same vehicle
 * and dates) or **Remove from cart** rather than just a dead link out.
 */
export default function ContractPage() {
  const { vehicleId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const bookingId = location.state?.bookingId;
  // "I have read and understood this agreement" — Accept stays off until it's ticked.
  const [confirmedRead, setConfirmedRead] = useState(false);
  // Read part by part; the confirmation and Accept only come once the last part (the signatures) is reached.
  const [readToEnd, setReadToEnd] = useState(false);
  // A group moves on to the next booking's contract on this same page: that one is read and confirmed afresh.
  useEffect(() => {
    setConfirmedRead(false);
    setReadToEnd(false);
  }, [bookingId]);
  const warnings = location.state?.warnings || [];
  const draft = useContractDraft();
  const accept = useAcceptContract();
  const cartItems = useCartStore((s) => s.items);
  const removeCartItem = useCartStore((s) => s.removeItem);
  const updateCartItem = useCartStore((s) => s.updateItem);
  // Which booking's draft has already been requested — not just a boolean, because a multi-vehicle
  // (grouped) checkout reuses this same page for the *next* booking in the group without unmounting it
  // (same route, a different `bookingId` in navigation state): a plain "have I requested yet" flag would
  // stay true from the first booking and never draft the next one.
  const [requestedFor, setRequestedFor] = useState(null);
  // Same per-booking tracking as `requestedFor` above, and for the same reason: this page is reused for the
  // next booking in a group without unmounting, so a plain boolean would only ever show the warning once
  // for the whole group instead of once per booking that actually has one.
  const [warningsShownFor, setWarningsShownFor] = useState(null);
  const [warningsOpen, setWarningsOpen] = useState(false);
  // Re-fetched fresh (not from an earlier, possibly stale cache): the owner may have declined the booking,
  // or its payment hold may have run out, while the renter was still on this page — see useBookings.js.
  const { data: booking } = useBooking(bookingId, { staleTime: 0 });
  const renterName = useRenterName(booking);
  const unfulfilled = isBookingUnfulfilled(booking?.status);
  // The backend refused to draft it because it's already past that stage — not the same as `unfulfilled`
  // (rejected/expired), and not worth retrying: "Try again" would only ever fail the same way again.
  const alreadyPastContract = draft.isError && !unfulfilled && ALREADY_HANDLED_HINT.test(draft.error?.response?.data?.message || '');
  const cancelledCartItem = booking?.status === 'CANCELLED' ? cartItems.find((i) => i.bookingId === bookingId) : undefined;
  // The template's {{fields}} (renter, vehicle, trip, charges) filled in with this booking's details.
  const contractText = useFilledContract(bookingId, draft.data?.contractText, draft.data?.acceptedAt);

  function rebookCancelled() {
    updateCartItem(cancelledCartItem.vehicleId, { bookingId: undefined, contractAccepted: false, signed: false });
    navigate('/booking');
  }

  function removeCancelled() {
    removeCartItem(cancelledCartItem.vehicleId);
    navigate(cartItems.length > 1 ? '/booking' : '/vehicles');
  }

  useEffect(() => {
    if (bookingId && requestedFor !== bookingId) {
      setRequestedFor(bookingId);
      draft.mutate(bookingId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    if (bookingId && warnings.length > 0 && warningsShownFor !== bookingId) {
      setWarningsShownFor(bookingId);
      setWarningsOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, warnings.length]);

  if (!bookingId) {
    return (
      <PageWrapper className="max-w-lg mx-auto flex flex-col items-center gap-4 text-center min-h-[60vh] justify-center">
        <ErrorBanner message="We couldn't find which booking this contract is for. Please start again from your booking." />
        <Link
          to={`/vehicles/${vehicleId}`}
          className="text-brand-gold text-sm font-semibold hover:text-brand-gold-light focus-ring rounded-md"
        >
          Back to vehicle
        </Link>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="max-w-[80rem] mx-auto">
      <PageTitle title="Review Contract" />
      <ContractPageLayout
        back={<BackLink to="/booking/checkout" label="Back to checkout" />}
        title="Your Rental Contract"
        intro="Read it part by part with Next. On the last part, confirm you have read it, then accept to continue to payment."
      >

        {draft.isPending && (
          <div className="flex justify-center py-10">
            <Spinner size="lg" label="Preparing contract" />
          </div>
        )}

        {draft.isError && !alreadyPastContract && (
          <ErrorBanner
            message={draft.error?.response?.data?.message || 'Could not prepare your contract.'}
            onRetry={() => draft.mutate(bookingId)}
          />
        )}

        {unfulfilled && <BookingUnavailableNotice booking={booking} />}

        {alreadyPastContract && (
          <div className="rounded-xl bg-white/5 border border-white/10 px-5 py-4 flex flex-col gap-3">
            <p className="text-brand-grey text-sm">
              {booking?.status === 'CANCELLED'
                ? 'This booking was cancelled.'
                : "This booking's contract has already been taken care of."}
            </p>
            {booking?.status === 'CANCELLED' ? (
              cancelledCartItem ? (
                <div className="flex gap-3 flex-wrap">
                  <Button onClick={rebookCancelled}>
                    <RotateCcw size={14} aria-hidden="true" /> Try booking again
                  </Button>
                  <Button variant="danger" onClick={removeCancelled}>
                    <Trash2 size={14} aria-hidden="true" /> Remove from cart
                  </Button>
                </div>
              ) : (
                <Button to="/vehicles" className="self-start">
                  <Car size={14} aria-hidden="true" /> Browse other vehicles
                </Button>
              )
            ) : (
              <Button to={`/book/${bookingId}/payment`} state={{ bookingId }} className="self-start">
                <CreditCard size={14} aria-hidden="true" /> Continue to payment
              </Button>
            )}
          </div>
        )}

        {draft.isSuccess && !unfulfilled && (
          <>
            <ContractViewer
              key={bookingId}
              contractText={contractText}
              pdfUrl={draft.data?.pdfUrl}
              document={{
                reference: bookingId,
                agreementDate: draft.data?.acceptedAt || new Date(),
                renter: { name: renterName, signedAt: renterSignedAt(draft.data) },
                owner: { name: draft.data?.ownerSignedBy, signedAt: ownerSignedAt(draft.data) },
                staged: true,
                onProgress: ({ atEnd }) => atEnd && setReadToEnd(true),
              }}
            />
            {readToEnd && (
            <ContractConfirmBar
              confirmed={confirmedRead}
              onConfirmedChange={setConfirmedRead}
              loading={accept.isPending}
              onAction={() => accept.mutate(bookingId)}
            >
              {!accept.isPending && <CheckCircle2 size={16} aria-hidden="true" />} Accept &amp; Continue
            </ContractConfirmBar>
            )}
          </>
        )}
      </ContractPageLayout>

      <BookingWarningsModal isOpen={warningsOpen} onClose={() => setWarningsOpen(false)} warnings={warnings} />
    </PageWrapper>
  );
}
