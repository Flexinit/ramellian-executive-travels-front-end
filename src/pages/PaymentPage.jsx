import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PenLine, CreditCard, RotateCcw, Users } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import PaymentSummary from '../components/payment/PaymentSummary';
import PaymentStatusPanel from '../components/payment/PaymentStatusPanel';
import SplitPaymentForm from '../components/payment/SplitPaymentForm';
import MpesaLogo from '../components/payment/MpesaLogo';
import SplitPaymentProgress from '../components/payment/SplitPaymentProgress';
import BookingUnavailableNotice from '../components/booking/BookingUnavailableNotice';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import BackLink from '../components/ui/BackLink';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import Input from '../components/ui/Input';
import SegmentedControl from '../components/ui/SegmentedControl';
import { useBooking } from '../hooks/useBookings';
import { useVehicle } from '../hooks/useVehicles';
import { useQueryClient } from '@tanstack/react-query';
import { usePesapalCheckout, useMpesaCheckout, usePaymentStatus, useExistingPaymentCheck, paymentStatusKey } from '../hooks/usePayment';
import { useAuthStore } from '../store/authStore';
import { splitIsPaid, splitTotal, useRetryContribution, useSplitPayment, useStartSplit } from '../hooks/useSplitPayment';
import { usePlatformSettings } from '../hooks/usePlatformSettings';
import { apiErrorMessage } from '../lib/apiError';
import { normalizePhone } from '../lib/phone';
import { PAYMENT_STATUSES } from '../lib/constants';
import { calculateTotalPrice, isBookingUnfulfilled } from '../lib/utils';
import { amountToPay } from '../lib/paymentTotal';

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
/** How the renter pays (product owner, 2026-10-27: M-Pesa first): a prompt on their phone, or Pesapal's page. */
/** The M-Pesa options carry M-Pesa's green. */
const MpesaIcon = () => <MpesaLogo size={18} />;
const SplitIcon = (props) => <Users {...props} className="text-mpesa-deep" />;

const METHODS = [
  { value: 'mpesa', label: 'M-Pesa', icon: MpesaIcon },
  // Several people each pay their share by M-Pesa prompt (product owner, 2026-10-27).
  { value: 'split', label: 'Split the cost', icon: SplitIcon },
  { value: 'pesapal', label: 'Card & other', icon: CreditCard },
];

/** A Kenyan number as Safaricom writes it (+2547…), or null — an M-Pesa prompt can only go to a Kenyan line. */
function mpesaNumber(input) {
  const n = normalizePhone(input);
  return n && n.startsWith('+254') ? n : null;
}

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { vehicleId } = useParams();
  const bookingId = location.state?.bookingId || sessionStorage.getItem(`booking:${vehicleId}`);
  // The page opens on "How to pay" (product owner, 2026-11-04: never "waiting for confirmation" before the renter has
  // been asked to pay). It only opens on a payment's progress when one is really under way from here: back from
  // Pesapal's own page (PaymentSuccessPage says so), or an M-Pesa prompt / split this browser started. An older,
  // unconfirmed payment record doesn't count — the choice shows, with a note to check it (`earlierPayment` below).
  const resumable = () => {
    if (!bookingId || sessionStorage.getItem(`checkout:${bookingId}`) !== '1') return false;
    const stored = sessionStorage.getItem(`checkout-provider:${bookingId}`);
    return !!location.state?.returnedFromPesapal || stored === 'mpesa' || stored === 'split';
  };
  const [checkoutStarted, setCheckoutStarted] = useState(resumable);
  // Captured once, at mount, from the same flag `checkoutStarted` reads — so unlike `checkoutStarted` itself
  // (which `handlePay` flips true the instant "Proceed to Payment" is clicked, before Pesapal is even
  // involved), this stays false for a fresh click in *this* page load and only starts true when the page is
  // loading because Pesapal already redirected back here. Together with `continuedToPesapal` below, it's
  // what `pollingEnabled` uses to tell "a payment might genuinely exist to check" apart from "a checkout was
  // merely just clicked" — see that constant's own comment.
  const [resuming] = useState(resumable);
  // Flips true only once the renter actually clicks "Continue to Pesapal" (PaymentStatusPanel's `onContinue`)
  // — including a middle/ctrl/cmd-click that opens it in a new tab, where this tab's app keeps running.
  const [continuedToPesapal, setContinuedToPesapal] = useState(false);
  // Paying in Pesapal's frame right now (a checkout just started here): status checks wait until the frame reports
  // the payment finished, so they can't give up — or show an earlier attempt's result — while the renter is paying.
  const [payingInFrame, setPayingInFrame] = useState(false);
  const queryClient = useQueryClient();

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
  // The renter chose another way to pay: don't bounce them back to the payment they just switched away from.
  const [choosing, setChoosing] = useState(false);
  // Already paid (in another tab, another device, or before a reload): straight to the result. Anything short of paid
  // leaves the choice of how to pay on screen.
  useEffect(() => {
    if (checkoutStarted || choosing || existingPayment.status !== PAYMENT_STATUSES.SUCCESSFUL) return;
    if (bookingId) sessionStorage.setItem(`checkout:${bookingId}`, '1');
    setCheckoutStarted(true);
  }, [checkoutStarted, choosing, existingPayment.status, bookingId]);
  // A payment started earlier that hasn't been confirmed (or refused): mentioned above the choice, in case it went through.
  const earlierPayment = !checkoutStarted && !choosing && !!existingPayment.status
    && ![PAYMENT_STATUSES.SUCCESSFUL, PAYMENT_STATUSES.FAILED, PAYMENT_STATUSES.INVALID].includes(existingPayment.status);
  // Polling only has anything to check once the renter has actually been sent toward Pesapal — resuming a
  // session that already got that far (`resuming`), having just clicked through in this one
  // (`continuedToPesapal`), or a payment record already existing (`existingPayment.status`, the lost-flag
  // case above). Merely having clicked "Proceed to Payment" moments ago (`checkoutStarted` alone) is not
  // enough: that flips true before `checkout.mutate` even resolves, let alone before the renter has clicked
  // the resulting Pesapal link — polling from that instant wasted calls against a payment that couldn't
  // exist yet, and could burn through `usePaymentStatus`'s fixed attempt budget before the renter had even
  // left for Pesapal (worst case if they opened the link in a new tab and this tab kept ticking the whole
  // time they were over there paying).
  // Paying by M-Pesa prompt (STK push) — remembered per booking, so a reload keeps checking the right status.
  const [provider, setProvider] = useState(() => (bookingId && sessionStorage.getItem(`checkout-provider:${bookingId}`)) || 'pesapal');
  const [method, setMethod] = useState('mpesa');
  const accountPhone = useAuthStore((s) => s.user?.phoneNumber || '');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState(null);
  const [promptedPhone, setPromptedPhone] = useState(() => (bookingId && sessionStorage.getItem(`checkout-phone:${bookingId}`)) || '');
  // When the last M-Pesa prompt went out — its 60-second countdown (PaymentStatusPanel) carries on across a reload.
  const [promptedAt, setPromptedAt] = useState(() => Number(bookingId && sessionStorage.getItem(`checkout-prompted-at:${bookingId}`)) || null);
  useEffect(() => {
    if (!phone && accountPhone) setPhone(accountPhone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountPhone]);
  const mpesa = useMpesaCheckout();
  const byMpesa = provider === 'mpesa';
  const bySplit = provider === 'split';
  const user = useAuthStore((s) => s.user);
  const split = useSplitPayment(bookingId, { enabled: checkoutStarted && bySplit });
  const startSplit = useStartSplit();
  const resend = useRetryContribution();
  const [splitError, setSplitError] = useState(null);
  const { data: settings } = usePlatformSettings();
  const pollingEnabled = bySplit
    ? false
    : byMpesa
    ? checkoutStarted
    : checkoutStarted && !payingInFrame && (resuming || continuedToPesapal || !!existingPayment.status);
  const paymentStatus = usePaymentStatus(bookingId, pollingEnabled, provider);
  const unfulfilled = isBookingUnfulfilled(booking?.status);
  const settled = [PAYMENT_STATUSES.SUCCESSFUL, PAYMENT_STATUSES.FAILED, PAYMENT_STATUSES.INVALID].includes(paymentStatus.data?.status);
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

  /** Back to choosing how to pay — after an M-Pesa prompt or a split that failed, ran out or went unanswered. */
  function payAnotherWay(nextMethod = 'pesapal') {
    sessionStorage.removeItem(`checkout:${bookingId}`);
    sessionStorage.removeItem(`checkout-provider:${bookingId}`);
    queryClient.removeQueries({ queryKey: paymentStatusKey(bookingId, 'mpesa') });
    queryClient.removeQueries({ queryKey: ['split-payment', bookingId] });
    setSplitError(null);
    setProvider('pesapal');
    setMethod(nextMethod);
    setChoosing(true);
    setCheckoutStarted(false);
  }

  /** Sends each person their M-Pesa prompt for their share — the same last check on the booking as any payment. */
  async function handleSplit(request) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSplitError(null);
    try {
      const { data: fresh } = await refetchBooking();
      if (isBookingUnfulfilled(fresh?.status)) {
        toast.error("This booking is no longer available — see below.");
        return;
      }
      await startSplit.mutateAsync({ bookingId, ...request });
      sessionStorage.setItem(`checkout:${bookingId}`, '1');
      setProvider('split');
      setCheckoutStarted(true);
      toast.success('Payment requests sent — everyone gets a prompt on their phone.');
    } catch (error) {
      setSplitError(apiErrorMessage(error, "Couldn't send the payment requests. Please try again."));
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  // A retry keeps the way already being used to pay; a first payment uses the one chosen.
  async function handlePay(chosen = checkoutStarted ? provider : method) {
    // The M-Pesa number is checked before anything else, so nothing is started for a number that can't get a prompt.
    const via = chosen === 'mpesa' ? 'mpesa' : 'pesapal';
    const mpesaPhone = via === 'mpesa' ? mpesaNumber(byMpesa && checkoutStarted ? promptedPhone || phone : phone) : null;
    if (via === 'mpesa' && !mpesaPhone) {
      setPhoneError('Enter a Kenyan M-Pesa number, e.g. 0712 345 678.');
      return;
    }
    setPhoneError(null);
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      // One last, deliberately fresh check right before money moves — the highest-value moment to catch a
      // booking the owner has just declined, or whose hold has just run out, since the page loaded.
      const { data: fresh } = await refetchBooking();
      if (isBookingUnfulfilled(fresh?.status)) {
        toast.error("This booking is no longer available — see below.");
        return;
      }
      if (via === 'mpesa') {
        const sent = await mpesa.mutateAsync({ bookingId, phone: mpesaPhone }).catch(() => null);
        if (!sent) return;
        // A fresh prompt: forget the last attempt's status (and its spent checks), then wait for the PIN.
        queryClient.removeQueries({ queryKey: paymentStatusKey(bookingId, 'mpesa') });
        sessionStorage.setItem(`checkout:${bookingId}`, '1');
        sessionStorage.setItem(`checkout-phone:${bookingId}`, mpesaPhone);
        const sentAt = Date.now();
        sessionStorage.setItem(`checkout-prompted-at:${bookingId}`, String(sentAt));
        setPromptedAt(sentAt);
        setPromptedPhone(mpesaPhone);
        setProvider('mpesa');
        setCheckoutStarted(true);
        return;
      }
      sessionStorage.removeItem(`checkout-provider:${bookingId}`);
      setProvider('pesapal');
      if (bookingId) sessionStorage.setItem(`checkout:${bookingId}`, '1');
      setCheckoutStarted(true);
      // A retry (after FAILED, or exhausted with no redirect to fall back to) generates a brand new Pesapal
      // link — pause polling again until the renter actually clicks through to *that* one, same as the first
      // attempt; `resuming`/`existingPayment.status` still cover the cases where polling should stay on.
      setContinuedToPesapal(false);
      // `usePesapalCheckout`'s own onSuccess/onError still handle the result (sessionStorage, toasts); its
      // error is already surfaced via `onError`, so it's not re-thrown here.
      const data = await checkout.mutateAsync(bookingId).catch(() => null);
      if (data?.redirectUrl) {
        // A fresh link: forget the last attempt's status (and its spent attempts), then pay in the frame.
        queryClient.removeQueries({ queryKey: paymentStatusKey(bookingId) });
        setPayingInFrame(true);
      }
      // Pesapal's page now opens right here, in the panel's frame (PesapalFrame) — the browser no longer leaves for
      // it. Polling starts once that frame reports the payment finished (the panel's `onContinue`).
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
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

  const status = bySplit ? (splitIsPaid(split.data) ? PAYMENT_STATUSES.SUCCESSFUL : undefined) : paymentStatus.data?.status;
  // What the shares of a split must add up to: the booking's whole charge, M-Pesa fees included (splitTotal).
  const due = splitTotal(booking, settings, vehicle);
  // What this booking costs paid the way being used (or chosen): the rental plus that method's fees — what the M-Pesa
  // prompt or Pesapal will actually ask for.
  const payingBy = checkoutStarted ? provider : method;
  const toPay = amountToPay(booking, vehicle, settings, payingBy);
  const amountDue = due.total || calculateTotalPrice(vehicle?.dailyPrice, booking?.numberOfDays);
  const yourName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <>
    {/* Side by side from md up (product owner, 2026-11-04): what it costs on the left, paying it on the right. */}
    <PageWrapper className="max-w-5xl mx-auto">
      <PageTitle title="Payment" />
      <div className="flex flex-col gap-6">
        {/* Paid: nothing to go back and change, so the way back is the booking itself. */}
        {status === PAYMENT_STATUSES.SUCCESSFUL ? (
          <BackLink to={`/dashboard/bookings/${bookingId}`} label="View booking" />
        ) : (
          <BackLink to={`/book/${bookingId}/contract`} state={{ bookingId }} label="Back to contract" />
        )}
        <div>
          <h1 className="font-heading text-ink text-2xl font-bold">Payment</h1>
          <p className="text-muted text-sm mt-1">
            {status === PAYMENT_STATUSES.SUCCESSFUL
              ? 'Your payment went through.'
              : checkoutStarted
                ? "We're confirming your payment."
                : 'Pay by M-Pesa, split the cost with others, or pay by card and other methods through Pesapal.'}
          </p>
        </div>

        {/* The booking and what it costs on the left (kept in view while paying), the payment and its next step on the
            right — stacked on a phone. The payment side is the wider: it holds the split form, Pesapal's box, the timer. */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-4 items-start">
        <PaymentSummary
          className="md:sticky md:top-24"
          booking={booking}
          vehicle={vehicle}
          paid={status === PAYMENT_STATUSES.SUCCESSFUL}
          paidAmount={paymentStatus.data?.amount}
          breakdown={booking ? toPay : undefined}
        />

        <Card className="p-4 flex flex-col gap-3">
        {unfulfilled && <BookingUnavailableNotice booking={booking} />}

        {checkoutStarted && bySplit && status !== PAYMENT_STATUSES.SUCCESSFUL ? (
          split.isLoading ? (
            <div className="flex justify-center py-6"><Spinner label="Loading the split payment" /></div>
          ) : split.data ? (
            <SplitPaymentProgress
              split={split.data}
              yourPhone={accountPhone}
              resendingId={resend.isPending ? resend.variables?.contributionId : null}
              onResend={(contributionId) => resend.mutate({ bookingId, contributionId })}
              onStartAgain={() => payAnotherWay('split')}
              onPayAnotherWay={() => payAnotherWay('mpesa')}
            />
          ) : (
            <ErrorBanner
              message={split.isError ? apiErrorMessage(split.error, "Couldn't load the split payment.") : "We couldn't find this split payment."}
              onRetry={split.isError ? () => split.refetch() : () => payAnotherWay('split')}
            />
          )
        ) : checkoutStarted ? (
          <>
            <PaymentStatusPanel
              status={status}
              exhausted={paymentStatus.exhausted}
              errorMessage={paymentStatus.errorMessage}
              onRecheck={() => paymentStatus.refetch()}
              onRetry={() => handlePay()}
              retrying={isSubmitting}
              redirectUrl={byMpesa ? undefined : checkout.data?.redirectUrl || sessionStorage.getItem(`checkout-url:${bookingId}`)}
              mpesaPhone={byMpesa && !settled ? promptedPhone : undefined}
              mpesaPromptedAt={promptedAt}
              paying={payingInFrame}
              onContinue={() => {
                setPayingInFrame(false);
                setContinuedToPesapal(true);
              }}
              booking={booking}
              vehicle={vehicle}
            />
            {/* Any payment not through yet — including one started before M-Pesa and splitting existed — can switch to
                another way: back to the choice of M-Pesa, Split the cost or Card & other. */}
            {status !== PAYMENT_STATUSES.SUCCESSFUL && !payingInFrame && (
              <Button variant="outline" size="sm" className="self-center" onClick={() => payAnotherWay(byMpesa ? 'pesapal' : 'mpesa')}>
                <CreditCard size={14} aria-hidden="true" /> Choose another way to pay
              </Button>
            )}
            {status === PAYMENT_STATUSES.SUCCESSFUL && (
              <Button
                onClick={() => navigate(`/book/${vehicleId}/sign`, { state: { bookingId }, replace: true })}
              >
                <PenLine size={16} aria-hidden="true" /> Continue to Sign Contract
              </Button>
            )}
          </>
        ) : !unfulfilled ? (
          <div className="flex flex-col gap-4">
            {earlierPayment && (
              <div role="status" className="rounded-tile bg-amber-500/10 px-4 py-3 text-sm text-ink flex flex-wrap items-center justify-between gap-2">
                <span>You started a payment for this booking earlier that hasn&apos;t been confirmed. Already paid?</span>
                <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: paymentStatusKey(bookingId) })}>
                  <RotateCcw size={14} aria-hidden="true" /> Check its status
                </Button>
              </div>
            )}
            <SegmentedControl label="How to pay" size="sm" options={METHODS} value={method} onChange={setMethod} className="self-start" />
            {method === 'split' ? (
              <SplitPaymentForm
                total={amountDue}
                breakdown={due.lines}
                you={{ name: yourName, phone: accountPhone, email: user?.email }}
                onSubmit={handleSplit}
                submitting={isSubmitting}
                error={splitError}
              />
            ) : method === 'mpesa' ? (
              <>
                <Input
                  label="M-Pesa phone number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  hint="We'll send a payment prompt to this phone — enter your M-Pesa PIN there."
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
                  error={phoneError}
                />
                <Button variant="mpesa" loading={isSubmitting} disabled={isSubmitting} onClick={() => handlePay('mpesa')}>
                  {!isSubmitting && <MpesaLogo size={20} />} Send M-Pesa prompt
                </Button>
              </>
            ) : (
              <Button loading={isSubmitting} disabled={isSubmitting} onClick={() => handlePay('pesapal')}>
                {!isSubmitting && <CreditCard size={16} aria-hidden="true" />} Proceed to Payment
              </Button>
            )}
          </div>
        ) : null}
        </Card>
        </div>
      </div>
    </PageWrapper>
    </>
  );
}
