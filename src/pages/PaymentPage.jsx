import React, { useEffect, useRef, useState } from 'react';
import PageBackdrop from '../components/layout/PageBackdrop';
import nairobiSkyline from '../assets/destinations/nairobi-skyline.jpg';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PenLine, CreditCard } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import PaymentSummary from '../components/payment/PaymentSummary';
import PaymentStatusPanel from '../components/payment/PaymentStatusPanel';
import BookingUnavailableNotice from '../components/booking/BookingUnavailableNotice';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import BackLink from '../components/ui/BackLink';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useBooking } from '../hooks/useBookings';
import { useVehicle } from '../hooks/useVehicles';
import { usePesapalCheckout, usePaymentStatus, useExistingPaymentCheck } from '../hooks/usePayment';
import { PAYMENT_STATUSES } from '../lib/constants';
import { isBookingUnfulfilled } from '../lib/utils';

/**
 * Handles both halves of the Pesapal flow on one page: initiating
 * checkout, and — after the provider redirects back — polling status.
 * "Do not mark payment successful in the browser" (FRONTEND_INTEGRATION.md
 * §4) — this only ever reflects `usePaymentStatus`'s polled result.
 *
 * `bookingId` is read from React Router navigation state (set when the
 * contract is accepted) and mirrored into sessionStorage, since the full
 * page reload that happens when Pesapal redirects the browser back loses
 * in-memory state. The exact shape of that return redirect is configured
 * server-side (`PESAPAL_CALLBACK_URL`, per §7) and wasn't confirmable
 * against a reachable backend — if the real callback doesn't land back on
 * this same URL, the "resume polling automatically" behavior here needs
 * revisiting once that's known.
 */
export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { vehicleId } = useParams();
  const bookingId = location.state?.bookingId || sessionStorage.getItem(`booking:${vehicleId}`);
  const [checkoutStarted, setCheckoutStarted] = useState(
    () => !!bookingId && sessionStorage.getItem(`checkout:${bookingId}`) === '1'
  );
  // Captured once, at mount, from the same flag `checkoutStarted` reads — so unlike `checkoutStarted` itself
  // (which `handlePay` flips true the instant "Proceed to Payment" is clicked, before Pesapal is even
  // involved), this stays false for a fresh click in *this* page load and only starts true when the page is
  // loading because Pesapal already redirected back here. Together with `continuedToPesapal` below, it's
  // what `pollingEnabled` uses to tell "a payment might genuinely exist to check" apart from "a checkout was
  // merely just clicked" — see that constant's own comment.
  const [resuming] = useState(() => !!bookingId && sessionStorage.getItem(`checkout:${bookingId}`) === '1');
  // Flips true only once the renter actually clicks "Continue to Pesapal" (PaymentStatusPanel's `onContinue`)
  // — including a middle/ctrl/cmd-click that opens it in a new tab, where this tab's app keeps running.
  const [continuedToPesapal, setContinuedToPesapal] = useState(false);

  useEffect(() => {
    if (bookingId) sessionStorage.setItem(`booking:${vehicleId}`, bookingId);
  }, [bookingId, vehicleId]);

  // Re-fetched fresh on arrival (not from an earlier, possibly stale cache): the owner may have declined
  // the booking, or its payment hold may have run out, while the renter was on the contract step.
  const { data: booking, isLoading: bookingLoading, isError: bookingError, refetch: refetchBooking } = useBooking(bookingId, { staleTime: 0 });
  const { data: vehicle } = useVehicle(booking?.vehicleId);
  const checkout = usePesapalCheckout();
  // Checked once, only while `checkoutStarted` is still false: has a payment record already shown up for
  // this booking from a checkout the local flag lost track of? If so, resume the normal status view below
  // instead of leaving "Proceed to Payment" offered for something already paid for (or already mid-payment).
  const existingPayment = useExistingPaymentCheck(bookingId, !checkoutStarted);
  useEffect(() => {
    if (checkoutStarted || !existingPayment.status) return;
    if (bookingId) sessionStorage.setItem(`checkout:${bookingId}`, '1');
    setCheckoutStarted(true);
  }, [checkoutStarted, existingPayment.status, bookingId]);
  // Polling only has anything to check once the renter has actually been sent toward Pesapal — resuming a
  // session that already got that far (`resuming`), having just clicked through in this one
  // (`continuedToPesapal`), or a payment record already existing (`existingPayment.status`, the lost-flag
  // case above). Merely having clicked "Proceed to Payment" moments ago (`checkoutStarted` alone) is not
  // enough: that flips true before `checkout.mutate` even resolves, let alone before the renter has clicked
  // the resulting Pesapal link — polling from that instant wasted calls against a payment that couldn't
  // exist yet, and could burn through `usePaymentStatus`'s fixed attempt budget before the renter had even
  // left for Pesapal (worst case if they opened the link in a new tab and this tab kept ticking the whole
  // time they were over there paying).
  const pollingEnabled = checkoutStarted && (resuming || continuedToPesapal || !!existingPayment.status);
  const paymentStatus = usePaymentStatus(bookingId, pollingEnabled);
  const unfulfilled = isBookingUnfulfilled(booking?.status);
  // Guards the *entire* `handlePay` call, not just `checkout.isPending` — that only covers the mutation
  // itself, not the `await refetchBooking()` pre-check ahead of it. A fast double-click (or a slow network
  // making the first click's effect invisible for a moment) during that window would otherwise still start
  // two separate Pesapal checkouts for the same booking — a real double charge if both get completed, not
  // just a harmless duplicate request. A `ref` for the actual re-entry check, not just the `isSubmitting`
  // state below: two clicks fired before React re-renders both still close over the *same* `isSubmitting`
  // value from the render that created this handler, so state alone can't stop the second one — a ref reads
  // and writes immediately, with no render in between. `isSubmitting` itself still drives the visible
  // loading/disabled state, just one tick behind the ref.
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handlePay() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    let leaving = false;
    try {
      // One last, deliberately fresh check right before money moves — the highest-value moment to catch a
      // booking the owner has just declined, or whose hold has just run out, since the page loaded.
      const { data: fresh } = await refetchBooking();
      if (isBookingUnfulfilled(fresh?.status)) {
        toast.error("This booking is no longer available — see below.");
        return;
      }
      if (bookingId) sessionStorage.setItem(`checkout:${bookingId}`, '1');
      setCheckoutStarted(true);
      // A retry (after FAILED, or exhausted with no redirect to fall back to) generates a brand new Pesapal
      // link — pause polling again until the renter actually clicks through to *that* one, same as the first
      // attempt; `resuming`/`existingPayment.status` still cover the cases where polling should stay on.
      setContinuedToPesapal(false);
      // `usePesapalCheckout`'s own onSuccess/onError still handle the result (sessionStorage, toasts); its
      // error is already surfaced via `onError`, so it's not re-thrown here.
      const data = await checkout.mutateAsync(bookingId).catch(() => null);
      // Straight to Pesapal — the renter just chose to pay, so no "ready to pay" countdown in between. The
      // panel's own Continue to Payment link stays as the fallback if this navigation doesn't happen.
      if (data?.redirectUrl) {
        setContinuedToPesapal(true);
        window.location.assign(data.redirectUrl);
        leaving = true;
      }
    } finally {
      // Leaving for Pesapal: keep the guard on, so a second click before the page unloads can't start
      // another checkout (two checkouts could become two real charges).
      if (!leaving) {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  }

  if (!bookingId) {
    return (
      <PageWrapper className="max-w-lg mx-auto min-h-[60vh] flex items-center justify-center">
        <ErrorBanner message="We couldn't find which booking this payment is for. Please start again from your bookings." />
      </PageWrapper>
    );
  }

  if (bookingLoading) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" label="Loading booking" />
      </PageWrapper>
    );
  }

  if (bookingError || !booking) {
    return (
      <PageWrapper>
        <ErrorBanner message="Could not load your booking." />
      </PageWrapper>
    );
  }

  const status = paymentStatus.data?.status;

  return (
    <PageBackdrop image={nairobiSkyline}>
    <PageWrapper className="max-w-md mx-auto">
      <PageTitle title="Payment" />
      <div className="flex flex-col gap-6">
        {/* Paid: nothing to go back and change, so the way back is the booking itself. */}
        {status === PAYMENT_STATUSES.SUCCESSFUL ? (
          <BackLink to={`/dashboard/bookings/${bookingId}`} label="View booking" />
        ) : (
          <BackLink to={`/book/${bookingId}/contract`} state={{ bookingId }} label="Back to contract" />
        )}
        <div>
          <h1 className="font-heading text-brand-white text-2xl font-bold">Payment</h1>
          <p className="text-brand-grey text-sm mt-1">
            {status === PAYMENT_STATUSES.SUCCESSFUL
              ? 'Your payment went through.'
              : checkoutStarted
                ? "We're confirming your payment."
                : "You'll be redirected to complete payment securely."}
          </p>
        </div>

        {/* The booking on the left, the payment and its next step beside it (stacked on a phone). */}
        {/* The booking on top, the payment and its next step in a matching card underneath, the same width. */}
        <div className="flex flex-col gap-4">
        <PaymentSummary booking={booking} vehicle={vehicle} paid={status === PAYMENT_STATUSES.SUCCESSFUL} />

        <Card className="p-4 flex flex-col gap-3">
        {unfulfilled && <BookingUnavailableNotice booking={booking} />}

        {checkoutStarted ? (
          <>
            <PaymentStatusPanel
              status={status}
              exhausted={paymentStatus.exhausted}
              errorMessage={paymentStatus.errorMessage}
              onRecheck={() => paymentStatus.refetch()}
              onRetry={handlePay}
              retrying={isSubmitting}
              redirectUrl={checkout.data?.redirectUrl || sessionStorage.getItem(`checkout-url:${bookingId}`)}
              onContinue={() => setContinuedToPesapal(true)}
              booking={booking}
              vehicle={vehicle}
            />
            {status === PAYMENT_STATUSES.SUCCESSFUL && (
              <Button
                onClick={() => navigate(`/book/${vehicleId}/sign`, { state: { bookingId }, replace: true })}
              >
                <PenLine size={16} aria-hidden="true" /> Continue to Sign Contract
              </Button>
            )}
          </>
        ) : !unfulfilled ? (
          <Button loading={isSubmitting} disabled={isSubmitting} onClick={handlePay}>
            {!isSubmitting && <CreditCard size={16} aria-hidden="true" />} Proceed to Payment
          </Button>
        ) : null}
        </Card>
        </div>
      </div>
    </PageWrapper>
    </PageBackdrop>
  );
}
