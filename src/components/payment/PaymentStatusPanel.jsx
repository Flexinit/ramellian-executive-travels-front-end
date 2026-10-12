import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Clock, CreditCard } from 'lucide-react';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { PAYMENT_STATUSES } from '../../lib/constants';
import ReceiptActions from '../booking/ReceiptActions';

const AUTO_REDIRECT_DELAY_MS = 3000;
const AUTO_REDIRECT_SECONDS = AUTO_REDIRECT_DELAY_MS / 1000;

/**
 * @param {string} status — a PAYMENT_STATUSES value, or undefined while the first poll is in flight
 * @param {boolean} [exhausted] — every poll attempt used up with no SUCCESSFUL/FAILED/INVALID ever coming
 *   back (most often Pesapal's callback to the backend never landing) — shown distinctly from "still
 *   checking" so a renter isn't left staring at a spinner that has, in fact, already given up silently.
 * @param {string} [errorMessage] — why the status couldn't be checked at all (shown with the exhausted state)
 * @param {function} [onRecheck] — re-polls status once more without starting a brand new Pesapal checkout
 * @param {function} onRetry — starts an entirely new checkout: offered once payment is confirmed FAILED, and
 *   as the fallback once polling is exhausted with no `redirectUrl` to fall back to (e.g. a different
 *   browser/device than the one checkout started on, where the original link was never stashed)
 * @param {string} [redirectUrl] — the Pesapal checkout URL from the checkout just started (`usePayment.js`
 *   also stashes it in sessionStorage, so it survives a remount — see `checkout-url:{bookingId}`). While the
 *   renter is on the initial "You're ready to pay" panel (not yet `exhausted`, no status back yet), this
 *   auto-navigates to `redirectUrl` after `AUTO_REDIRECT_DELAY_MS`, counting down visibly in the panel's own
 *   text so the auto-redirect isn't a surprise — the button is kept visible as the fallback for a
 *   popup/redirect blocker, or simply so the renter doesn't have to wait. Once
 *   polling is `exhausted`, the equivalent button there is click-only again: a renter coming back later after
 *   already having been through this once shouldn't be auto-sent back to Pesapal without asking.
 * @param {function} [onContinue] — fired the moment "Continue to Pesapal" is actually clicked (including a
 *   middle/ctrl/cmd-click that opens it in a new tab, where this tab's own React app keeps running rather
 *   than unloading). The caller uses this to gate when status polling actually starts — see PaymentPage.jsx.
 * @param {boolean} [retrying] — `onRetry`'s own checkout mutation is in flight. Disables both "Try Again"
 *   buttons while true, the same guard "Proceed to Payment" already has on the page before this panel ever
 *   shows — without it, a fast double-click (or a slow response masking that the first click registered)
 *   fires `onRetry` twice, starting two separate Pesapal checkouts for the same booking: if a renter somehow
 *   completes both, that's two real charges for one booking, not just a harmless duplicate request.
 * @param {object} [booking] @param {object} [vehicle] — shown once `status` is SUCCESSFUL, to offer the
 *   renter their receipt right there (see ReceiptActions) — the moment the payment actually completes is
 *   the most natural place to "issue" it, rather than making them go find it in My Bookings afterwards.
 */
export default function PaymentStatusPanel({ status, exhausted, errorMessage, onRecheck, onRetry, redirectUrl, onContinue, retrying, booking, vehicle }) {
  // Only the initial "ready to pay" panel auto-redirects — guarded on `exhausted` and `status` too, since
  // those cover the SUCCESSFUL/FAILED/INVALID and exhausted-with-redirectUrl branches below, which also
  // render while `redirectUrl` is set but must never auto-navigate themselves.
  const autoRedirectReady = !!redirectUrl && !status && !exhausted;
  const redirectTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  // A ref, not a dependency, so a parent re-render that merely recreates the `onContinue` callback (as
  // PaymentPage.jsx's inline `() => setContinuedToPesapal(true)` does every render) can't restart this timer.
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;
  // Ticks down in lockstep with `redirectTimerRef` below purely for display — kept as a second, separate
  // timer rather than driving the actual redirect off of it, so the one piece of code that navigates the
  // browser away (the `setTimeout` callback) stays a single, unambiguous place that only ever fires once.
  const [secondsLeft, setSecondsLeft] = useState(AUTO_REDIRECT_SECONDS);

  useEffect(() => {
    if (!autoRedirectReady) return;
    setSecondsLeft(AUTO_REDIRECT_SECONDS);
    countdownIntervalRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(s - 1, 0));
    }, 1000);
    redirectTimerRef.current = setTimeout(() => {
      onContinueRef.current?.();
      window.location.href = redirectUrl;
    }, AUTO_REDIRECT_DELAY_MS);
    return () => {
      clearTimeout(redirectTimerRef.current);
      clearInterval(countdownIntervalRef.current);
    };
  }, [autoRedirectReady, redirectUrl]);

  // Shared by the manual click and the auto-redirect's own `onContinueRef` call above — stops the timer (and
  // its countdown) from firing a second, redundant navigation on top of a renter who already clicked (or
  // middle/ctrl/cmd-clicked to open Pesapal in a new tab, where this tab's timer would otherwise still fire
  // into the current one).
  function handleManualContinue() {
    clearTimeout(redirectTimerRef.current);
    clearInterval(countdownIntervalRef.current);
    onContinue?.();
  }

  if (status === PAYMENT_STATUSES.SUCCESSFUL) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-6">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 size={26} className="text-emerald-400" aria-hidden="true" />
        </div>
        <div>
          <p className="text-brand-white font-semibold">Payment successful</p>
          <p className="text-brand-grey text-sm mt-1">Next, sign your contract to confirm the booking.</p>
        </div>
        {booking && <ReceiptActions booking={booking} vehicle={vehicle} />}
      </div>
    );
  }

  if (status === PAYMENT_STATUSES.FAILED || status === PAYMENT_STATUSES.INVALID) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-6">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <XCircle size={26} className="text-red-400" aria-hidden="true" />
        </div>
        <div>
          <p className="text-brand-white font-semibold">Payment failed</p>
          <p className="text-brand-grey text-sm mt-1">Your payment wasn't completed. You can try again.</p>
        </div>
        {onRetry && (
          <Button size="sm" loading={retrying} disabled={retrying} onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    );
  }

  if (exhausted) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-6">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Clock size={26} className="text-amber-400" aria-hidden="true" />
        </div>
        <div>
          <p className="text-brand-white font-semibold">{errorMessage ? "Couldn't check your payment" : 'Still confirming your payment'}</p>
          {errorMessage && <p role="alert" className="text-red-400 text-sm mt-1">{errorMessage}</p>}
          <p className="text-brand-grey text-sm mt-1">
            {errorMessage ? '' : <>This is taking longer than usual — we haven&apos;t heard back yet.{' '}</>}
            {redirectUrl
              ? "If you haven't finished paying yet, continue to payment below. Already paid? Check again."
              : 'If you already paid, it can still land in a moment — check again. Otherwise, try again to start a fresh payment.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {redirectUrl ? (
            <Button size="sm" href={redirectUrl} onClick={onContinue} onAuxClick={onContinue}>
              <CreditCard size={14} aria-hidden="true" /> Continue to Payment
            </Button>
          ) : (
            onRetry && (
              <Button size="sm" loading={retrying} disabled={retrying} onClick={onRetry}>
                <CreditCard size={14} aria-hidden="true" /> Try Again
              </Button>
            )
          )}
          {onRecheck && (
            <Button size="sm" onClick={onRecheck}>
              <RotateCcw size={14} aria-hidden="true" /> Check again
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (redirectUrl) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-6">
        <div>
          <p className="text-brand-white font-semibold">You're ready to pay</p>
          <p className="text-brand-grey text-sm mt-1">
            {secondsLeft > 0
              ? `Taking you to complete payment securely in ${secondsLeft}s. If nothing happens, click below to continue.`
              : "Taking you to complete payment securely. If nothing happens, click below to continue."}
          </p>
        </div>
        <Button size="lg" href={redirectUrl} onClick={handleManualContinue} onAuxClick={handleManualContinue}>
          <CreditCard size={16} aria-hidden="true" /> Continue to Payment
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center py-6">
      <Spinner size="lg" label="Checking payment status" />
      <p className="text-brand-grey text-sm">Waiting for your payment to be confirmed…</p>
      {/* No cached redirectUrl for this browser to offer above (a resumed session, a different device, or
          sessionStorage lost it) — rather than leaving this spinner with zero manual options until polling
          exhausts in PAYMENT_POLL_MAX_ATTEMPTS × PAYMENT_POLL_INTERVAL_MS (~30s), the same two actions the
          exhausted state already offers in this exact no-redirectUrl case are offered right away. */}
      {(onRetry || onRecheck) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
          {onRetry && (
            <Button size="sm" loading={retrying} disabled={retrying} onClick={onRetry}>
              <CreditCard size={14} aria-hidden="true" /> Continue to Payment
            </Button>
          )}
          {onRecheck && (
            <Button size="sm" onClick={onRecheck}>
              <RotateCcw size={14} aria-hidden="true" /> Check again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
