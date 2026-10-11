import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueries } from '@tanstack/react-query';
import { PenLine, CreditCard } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import BookingSummaryCard from '../components/booking/BookingSummaryCard';
import CartTotals from '../components/booking/CartTotals';
import BookingUnavailableNotice from '../components/booking/BookingUnavailableNotice';
import PaymentStatusPanel from '../components/payment/PaymentStatusPanel';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useCartStore } from '../store/cartStore';
import { useGroupCheckout, paymentStatusQuery, useGroupPollExhausted, useExistingPaymentChecks } from '../hooks/usePayment';
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
  const pollingEnabled = checkoutStarted && (resuming || continuedToPesapal || hasExistingPayment);
  const statuses = useQueries({ queries: items.map((item) => paymentStatusQuery(item.bookingId, pollingEnabled)) });
  const exhausted = useGroupPollExhausted(
    items.map((item) => item.bookingId),
    statuses.map((s) => s.data?.status),
    pollingEnabled
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
      if (groupId) sessionStorage.setItem(`group-checkout:${groupId}`, '1');
      setCheckoutStarted(true);
      // A retry generates a brand new combined Pesapal link — pause polling again until it's actually clicked,
      // same as the first attempt (see `pollingEnabled`'s own comment above).
      setContinuedToPesapal(false);
      await checkout.mutateAsync(groupId).catch(() => {});
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

  return (
    <PageWrapper className="max-w-5xl mx-auto">
      <PageTitle title="Payment" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-brand-white text-2xl font-bold">Payment</h1>
          <p className="text-brand-grey text-sm mt-1">
            {checkoutStarted
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

            {checkoutStarted ? (
              <>
                <PaymentStatusPanel
                  status={overallStatus}
                  exhausted={exhausted}
                  onRecheck={() => statuses.forEach((s) => s.refetch())}
                  onRetry={handlePay}
                  retrying={isSubmitting}
                  redirectUrl={checkout.data?.redirectUrl || sessionStorage.getItem(`group-checkout-url:${groupId}`)}
                  onContinue={() => setContinuedToPesapal(true)}
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
