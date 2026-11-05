import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { PenLine, CreditCard, RotateCcw } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import BackLink from '../components/ui/BackLink';
import BookingSummaryCard from '../components/booking/BookingSummaryCard';
import CartTotals from '../components/booking/CartTotals';
import BookingUnavailableNotice from '../components/booking/BookingUnavailableNotice';
import PaymentStatusPanel from '../components/payment/PaymentStatusPanel';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useCartStore } from '../store/cartStore';
import { useGroupCheckout, paymentStatusQuery, paymentStatusKey, useGroupPollExhausted, useExistingPaymentChecks, fetchBookingPayment } from '../hooks/usePayment';
import { apiGet } from '../lib/api';
import { PAYMENT_STATUSES } from '../lib/constants';
import { isBookingUnfulfilled } from '../lib/utils';

/**
 * The combined-payment step for a multi-vehicle selection (`docs/backend-requests.md` item 1 — one Pesapal
 * checkout for every booking in the group, added by the backend 2026-09-27). Reached once every booking in
 * the group has had its own contract accepted (`useAcceptContract`); every vehicle in the group is still in
 * the cart at that point, so the group's items are read straight from there rather than the URL.
 *
 * There is no `.../booking-groups/{groupId}/status` endpoint, so "is the group's payment done" is read as
 * "every booking in it reports the same settled status" from the existing per-booking status endpoint
 * (`paymentStatusQuery`, polled once per booking via `useQueries`).
 */
export default function GroupPaymentPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const groupId = useCartStore((s) => s.groupId);
  const [checkoutStarted, setCheckoutStarted] = useState(
    () => !!groupId && sessionStorage.getItem(`group-checkout:${groupId}`) === '1'
  );
  // Same split as PaymentPage.jsx's single-booking flow: `checkoutStarted` flips true the instant "Proceed
  // to Payment" is clicked, before Pesapal is involved at all, so it can't gate polling on its own — `resuming`
  // (captured once, from the same flag, only true when this page load is because Pesapal already redirected
  // back) and `continuedToPesapal` (true once the combined checkout link is actually clicked) are what
  // `pollingEnabled` below uses instead, so a renter who's slow to click through doesn't burn the fixed
  // polling-attempt budget before they've even reached Pesapal.
  const [resuming] = useState(() => !!groupId && sessionStorage.getItem(`group-checkout:${groupId}`) === '1');
  const [continuedToPesapal, setContinuedToPesapal] = useState(false);
  // Paying in Pesapal's frame right now — the same pause on status checks as PaymentPage's.
  const [payingInFrame, setPayingInFrame] = useState(false);
  const queryClient = useQueryClient();
  const [unfulfilledIds, setUnfulfilledIds] = useState([]);
  // Guards all of `handlePay`, not just `checkout.isPending` — see PaymentPage.jsx's own copy of this for
  // why the pre-check phase needs covering too, and why the actual re-entry check needs a ref rather than
  // just the `isSubmitting` state (two clicks fired before a re-render both close over the same state value).
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (groupId) sessionStorage.setItem('group-checkout-id', groupId);
  }, [groupId]);

  const checkout = useGroupCheckout();
  // Checked once per booking, only while `checkoutStarted` is still false: has a payment record already
  // shown up for any of them from a checkout the local `group-checkout:${groupId}` flag lost track of? If
  // so, resume the normal status view below — same reasoning, and same shared-cache trick, as
  // PaymentPage.jsx's `useExistingPaymentCheck` (see `docs/backend-requests.md` item 21 for how that flag
  // actually gets lost: Pesapal's own redirect landing on a different origin than checkout started from).
  const existingPayments = useExistingPaymentChecks(items.map((item) => item.bookingId), !checkoutStarted);
  const hasExistingPayment = existingPayments.some((p) => !!p.status);
  useEffect(() => {
    if (checkoutStarted || !hasExistingPayment) return;
    if (groupId) sessionStorage.setItem(`group-checkout:${groupId}`, '1');
    setCheckoutStarted(true);
  }, [checkoutStarted, hasExistingPayment, groupId]);
  const pollingEnabled = checkoutStarted && !payingInFrame && (resuming || continuedToPesapal || hasExistingPayment);
  // Each booking's payment whichever way it was made: after a part-paid group, the rest are paid one at a time — by
  // M-Pesa too — and this page still has to see the whole group as paid.
  const statuses = useQueries({ queries: items.map((item) => paymentStatusQuery(item.bookingId, pollingEnabled, 'any')) });
  const exhausted = useGroupPollExhausted(
    items.map((item) => item.bookingId),
    statuses.map((s) => s.data?.status),
    pollingEnabled,
    'any'
  );

  async function handlePay() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      // The same last, deliberately fresh check as the single-vehicle Payment page, right before money moves —
      // now across every booking in the group, since any one of them could have been declined meanwhile.
      const fresh = await Promise.all(items.map((item) => apiGet(`/bookings/${item.bookingId}`).catch(() => null)));
      const stillBad = fresh.filter((b) => isBookingUnfulfilled(b?.status)).map((b) => b.id);
      if (stillBad.length > 0) {
        setUnfulfilledIds(stillBad);
        toast.error('One of these bookings is no longer available — see below.');
        return;
      }
      // Right before charging the whole group: is any of it paid already (a payment that landed late, or paid
      // elsewhere)? Then no new group charge — all paid shows as paid, part paid offers the rest one at a time.
      const latest = await Promise.all(items.map((item) => fetchBookingPayment(item.bookingId).catch(() => null)));
      const paidNow = latest.filter((p) => p?.status === PAYMENT_STATUSES.SUCCESSFUL);
      if (paidNow.length > 0) {
        items.forEach((item, i) => latest[i] && queryClient.setQueryData(paymentStatusKey(item.bookingId, 'any'), latest[i]));
        if (groupId) sessionStorage.setItem(`group-checkout:${groupId}`, '1');
        setPayingInFrame(false);
        setCheckoutStarted(true);
        toast.success(paidNow.length === items.length ? 'These bookings are already paid — no need to pay again.' : 'Some of these bookings are already paid — pay the rest below.');
        return;
      }
      const firstAttempt = !checkoutStarted;
      if (groupId) sessionStorage.setItem(`group-checkout:${groupId}`, '1');
      setCheckoutStarted(true);
      // A retry generates a brand new combined Pesapal link — pause polling again until it's actually clicked,
      // same as the first attempt (see `pollingEnabled`'s own comment above).
      setContinuedToPesapal(false);
      const data = await checkout.mutateAsync(groupId).catch(() => null);
      if (data?.redirectUrl) {
        // A fresh link: forget the last attempt's statuses (and their spent attempts), then pay in the frame.
        items.forEach((item) => queryClient.removeQueries({ queryKey: paymentStatusKey(item.bookingId) }));
        setPayingInFrame(true);
      } else if (firstAttempt) {
        // Nothing was started (the hook has said why): back to Proceed to Payment, not "waiting for your payment".
        if (groupId) sessionStorage.removeItem(`group-checkout:${groupId}`);
        setCheckoutStarted(false);
      }
      // Pesapal's page now opens right here, in the panel's frame (PesapalFrame) — the browser no longer leaves for
      // it. Polling starts once that frame reports the payment finished (the panel's `onContinue`).
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  if (!groupId || items.length === 0) {
    return (
      <PageWrapper className="max-w-lg mx-auto min-h-[60vh] flex items-center justify-center">
        <ErrorBanner message="We couldn't find this group booking. Please start again from your booking." />
      </PageWrapper>
    );
  }

  const allSuccessful = statuses.length > 0 && statuses.every((s) => s.data?.status === PAYMENT_STATUSES.SUCCESSFUL);
  const anyFailed = statuses.some((s) => s.data?.status === PAYMENT_STATUSES.FAILED || s.data?.status === PAYMENT_STATUSES.INVALID);
  const overallStatus = anyFailed ? PAYMENT_STATUSES.FAILED : allSuccessful ? PAYMENT_STATUSES.SUCCESSFUL : PAYMENT_STATUSES.PENDING;
  const blocked = unfulfilledIds.length > 0;
  // Some bookings paid and the rest failed (or never confirmed): paying the group again would charge the paid ones
  // twice, so each unpaid booking is paid on its own Payment page instead.
  const paidIds = items.filter((_, i) => statuses[i]?.data?.status === PAYMENT_STATUSES.SUCCESSFUL).map((item) => item.bookingId);
  const stillPending = statuses.some((s) => s.data?.status === PAYMENT_STATUSES.PENDING);
  const partlyPaid = checkoutStarted && !payingInFrame && paidIds.length > 0 && !allSuccessful && (!stillPending || exhausted);
  const unpaidItems = items.filter((item) => !paidIds.includes(item.bookingId));

  return (
    <PageWrapper className="max-w-5xl mx-auto">
      <PageTitle title="Payment" />
      <div className="flex flex-col gap-6">
        <BackLink to="/booking/checkout" label="Back to checkout" />
        <div>
          <h1 className="font-heading text-ink text-2xl font-bold">Payment</h1>
          <p className="text-muted text-sm mt-1">
            {allSuccessful
              ? 'Your payment went through.'
              : checkoutStarted
              ? "We're confirming your payment."
              : `One payment for all ${items.length} vehicles — you'll be redirected to complete it securely.`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.vehicleId}>
                <BookingSummaryCard
                  vehicle={item.vehicle}
                  draft={item}
                  note={unfulfilledIds.includes(item.bookingId) ? <BookingUnavailableNotice booking={{ id: item.bookingId, status: 'REJECTED' }} /> : null}
                />
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            <CartTotals items={items} />

            {partlyPaid ? (
              <section role="status" aria-label="Part paid" className="flex flex-col gap-3 rounded-tile bg-amber-500/10 px-4 py-3">
                <p className="text-sm text-ink">
                  {paidIds.length} of {items.length} bookings are paid. The rest didn&apos;t go through — pay each of them below.
                  You won&apos;t be charged again for the ones already paid.
                </p>
                <ul className="flex flex-col gap-2">
                  {unpaidItems.map((item) => (
                    <li key={item.bookingId} className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm text-ink font-medium">{item.vehicle?.model || 'Vehicle'}</span>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/book/${item.vehicleId}/payment`, { state: { bookingId: item.bookingId } })}
                      >
                        <CreditCard size={14} aria-hidden="true" /> Pay this booking
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button size="sm" variant="outline" className="self-start" onClick={() => statuses.forEach((s) => s.refetch())}>
                  <RotateCcw size={14} aria-hidden="true" /> Check again
                </Button>
              </section>
            ) : checkoutStarted ? (
              <>
                <PaymentStatusPanel
                  status={overallStatus}
                  exhausted={exhausted}
                  onRecheck={() => statuses.forEach((s) => s.refetch())}
                  onRetry={handlePay}
                  retrying={isSubmitting}
                  redirectUrl={checkout.data?.redirectUrl || sessionStorage.getItem(`group-checkout-url:${groupId}`)}
                  paying={payingInFrame}
                  onContinue={() => {
                    setPayingInFrame(false);
                    setContinuedToPesapal(true);
                  }}
                />
                {overallStatus === PAYMENT_STATUSES.SUCCESSFUL && (
                  <Button
                    size="lg"
                    onClick={() => navigate(`/book/${items[0].bookingId}/sign`, { state: { bookingId: items[0].bookingId }, replace: true })}
                  >
                    <PenLine size={16} aria-hidden="true" /> Continue to Sign Contracts
                  </Button>
                )}
              </>
            ) : (
              <Button size="lg" loading={isSubmitting} disabled={blocked || isSubmitting} onClick={handlePay}>
                {!isSubmitting && <CreditCard size={16} aria-hidden="true" />} Proceed to Payment
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
