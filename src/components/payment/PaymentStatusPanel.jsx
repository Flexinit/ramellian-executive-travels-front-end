import React, { useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Clock, CreditCard, Smartphone } from 'lucide-react';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { MPESA_PROMPT_SECONDS, PAYMENT_STATUSES } from '../../lib/constants';
import ReceiptActions from '../booking/ReceiptActions';
import PesapalFrame from './PesapalFrame';
import MpesaLogo from './MpesaLogo';
import CircularCountdown from '../ui/CircularCountdown';

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
 *   also stashes it in sessionStorage, so it survives a remount — see `checkout-url:{bookingId}`). While the renter is
 *   on the "ready to pay" step (not yet `exhausted`, no status back yet), Pesapal's page is shown right here, in a frame
 *   (`PesapalFrame`, product owner 2026-10-27 — it used to send the whole browser to Pesapal). Once polling is
 *   `exhausted`, **Continue to Payment** opens the frame again.
 * @param {boolean} [paying] — the page has just started a checkout and the renter is paying in the frame: it's shown
 *   until that link is reported finished, whatever the (paused) status checks last said. Left out, the frame shows
 *   while there's no status yet and polling hasn't given up.
 * @param {string} [mpesaPhone] — paying by M-Pesa prompt (STK push) sent to this number: a 60-second countdown to
 *   approve it on the phone (`MpesaPromptWait`); once it runs out, the result with **Try again** (`onRetry`),
 *   **I've completed the payment** (`onConfirmPaid`) and **Use a different number** (`onChangeNumber`).
 * @param {number} [mpesaPromptedAt] — when that prompt was sent (ms), so the countdown survives a reload
 * @param {boolean} [mpesaConfirming] — checking again after **I've completed the payment** (see PaymentPage)
 * @param {boolean} [mpesaConfirmedNothing] — that check ran its course and the payment still isn't in
 * @param {function} [onConfirmPaid] — **I've completed the payment**, offered once the prompt's minute is up
 * @param {'mpesa'|'pesapal'} [provider] — how it's being paid, for a failure message that says what can go wrong
 * @param {function} [onChangeNumber] — back to the M-Pesa number (a prompt sent to the wrong phone), offered once the
 *   prompt has timed out or failed
 * @param {function} [onContinue] — the payment in the frame is finished (Pesapal's callback said so, or the renter
 *   pressed **I've finished paying**): the caller starts checking its status — see PaymentPage.jsx.
 * @param {boolean} [retrying] — `onRetry`'s own checkout mutation is in flight. Disables both "Try Again"
 *   buttons while true, the same guard "Proceed to Payment" already has on the page before this panel ever
 *   shows — without it, a fast double-click (or a slow response masking that the first click registered)
 *   fires `onRetry` twice, starting two separate Pesapal checkouts for the same booking: if a renter somehow
 *   completes both, that's two real charges for one booking, not just a harmless duplicate request.
 * @param {object} [booking] @param {object} [vehicle] — shown once `status` is SUCCESSFUL, to offer the
 *   renter their receipt right there (see ReceiptActions) — the moment the payment actually completes is
 *   the most natural place to "issue" it, rather than making them go find it in My Bookings afterwards.
 */

/**
 * Paying by M-Pesa prompt (product owner, 2026-11-04 and 2026-11-05). While the prompt is open on the phone, a 60-second
 * countdown — the page checks every few seconds and moves on the moment the payment is in; nothing else cuts the minute
 * short. When it's up, the result: not received, or failed (`failed`), with **Try again**, **I've completed the payment**
 * (`onConfirmPaid` — checks again for a little while, for a confirmation running late) and **Use a different number**.
 */
function MpesaPromptWait({ phone, promptedAt, failed, confirming, confirmedNothing, onConfirmPaid, onRetry, onRecheck, onChangeNumber, retrying }) {
  // Not knowing when the prompt went out (one from before this countdown existed) counts as timed out — the countdown
  // never restarts by itself; only **Try again** (a new prompt, a new `promptedAt`) starts another.
  const overAt = promptedAt ? promptedAt + MPESA_PROMPT_SECONDS * 1000 : 0;
  const [timedOut, setTimedOut] = useState(() => Date.now() >= overAt);
  const [shownFor, setShownFor] = useState(promptedAt);
  if (shownFor !== promptedAt) {
    setShownFor(promptedAt);
    setTimedOut(Date.now() >= overAt);
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-2">
        <MpesaLogo size={36} />
        <Spinner size="lg" label="Checking your M-Pesa payment" />
        <div>
          <p className="text-ink font-semibold">Checking your payment</p>
          <p className="text-muted text-sm mt-1">
            Looking for your M-Pesa payment from <strong className="text-ink">{phone}</strong> — this page moves on as soon as
            it&apos;s confirmed.
          </p>
        </div>
      </div>
    );
  }

  if (!timedOut) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-2">
        <MpesaLogo size={36} />
        <div>
          <p className="text-ink font-semibold">Check your phone</p>
          <p className="text-muted text-sm mt-1">
            We&apos;ve sent an M-Pesa prompt to <strong className="text-ink">{phone}</strong>. Enter your M-Pesa PIN there —
            this page moves on by itself once it&apos;s paid.
          </p>
        </div>
        {/* One more check as the time runs out, for a PIN entered in the last seconds. */}
        <CircularCountdown key={promptedAt} startedAt={promptedAt} durationSeconds={MPESA_PROMPT_SECONDS} onExpire={() => { setTimedOut(true); onRecheck?.(); }} label="left to enter your M-Pesa PIN" />
        {/* Sent to the wrong phone: no need to wait the minute out. */}
        {onChangeNumber && <ChangeNumberLink onClick={onChangeNumber} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center py-2">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${failed ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
        {failed ? <XCircle size={20} className="text-red-600" aria-hidden="true" /> : <Clock size={20} className="text-amber-600" aria-hidden="true" />}
      </div>
      <div>
        <p className="text-ink font-semibold">{failed ? 'Payment failed' : "We haven't received your payment yet"}</p>
        <p className="text-muted text-sm mt-1">
          {failed
            ? "The M-Pesa payment didn't go through — the prompt may have been cancelled or timed out, the PIN was wrong, or the balance was too low. Nothing was taken. You can try again."
            : <>No payment has come in from <strong className="text-ink">{phone}</strong> yet. Didn&apos;t get the prompt? Try again, and enter your PIN within a minute.</>}
        </p>
      </div>
      {confirmedNothing && (
        <p role="status" className="rounded-tile bg-amber-500/10 px-3 py-2 text-sm text-ink">
          We still can&apos;t see your payment. If money left your M-Pesa, it will show here once M-Pesa confirms it — check
          again in a minute, or contact us with your M-Pesa confirmation message.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button variant="mpesa" loading={retrying} disabled={retrying} onClick={onRetry}>
            {!retrying && <Smartphone size={16} aria-hidden="true" />} Try again
          </Button>
        )}
        {onConfirmPaid && (
          <Button variant="outline" onClick={onConfirmPaid}>
            <CheckCircle2 size={16} aria-hidden="true" /> I&apos;ve completed the payment
          </Button>
        )}
      </div>
      {onChangeNumber && <ChangeNumberLink onClick={onChangeNumber} />}
    </div>
  );
}

/** Back to the M-Pesa number, for a prompt sent to the wrong phone. */
function ChangeNumberLink({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-sm text-accent hover:underline focus-ring rounded">
      Use a different number
    </button>
  );
}

export default function PaymentStatusPanel({ status, exhausted, errorMessage, onRecheck, onRetry, redirectUrl, onContinue, retrying, booking, vehicle, paying, mpesaPhone, mpesaPromptedAt, mpesaConfirming, mpesaConfirmedNothing, onConfirmPaid, provider, onChangeNumber }) {
  // After a slow confirmation, Continue to Payment opens the frame again (rather than leaving the site).
  const [reopened, setReopened] = useState(false);
  // The frame stays until that payment link is reported finished; then the status checks take over. Kept per link, so
  // a retry's brand-new link (Try Again) shows its frame again.
  const [doneUrl, setDoneUrl] = useState(null);
  const frameDone = !!redirectUrl && doneUrl === redirectUrl;
  function finished() {
    setDoneUrl(redirectUrl);
    setReopened(false);
    onContinue?.();
    // Polling had already given up: ask again now that the payment is done.
    if (exhausted) onRecheck?.();
  }

  const framed = paying ?? (!status && !exhausted);
  if (redirectUrl && framed && !frameDone) {
    return (
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-ink font-semibold">Pay securely with Pesapal</p>
          <p className="text-muted text-sm mt-1">Choose how to pay below — you stay on this page.</p>
        </div>
        <PesapalFrame url={redirectUrl} onDone={finished} />
      </div>
    );
  }

  if (status === PAYMENT_STATUSES.SUCCESSFUL) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-2">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 size={20} className="text-emerald-600" aria-hidden="true" />
        </div>
        <div>
          <p className="text-ink font-semibold">Payment successful</p>
          <p className="text-muted text-sm mt-1">Next, sign your contract to confirm the booking.</p>
        </div>
        {booking && <ReceiptActions booking={booking} vehicle={vehicle} />}
      </div>
    );
  }

  // Paying by M-Pesa prompt: the countdown, then its result — failed included — with what to do next.
  if (mpesaPhone) {
    return (
      <MpesaPromptWait
        phone={mpesaPhone}
        promptedAt={mpesaPromptedAt}
        failed={status === PAYMENT_STATUSES.FAILED || status === PAYMENT_STATUSES.INVALID}
        confirming={mpesaConfirming}
        confirmedNothing={mpesaConfirmedNothing}
        onConfirmPaid={onConfirmPaid}
        onRetry={onRetry}
        onRecheck={onRecheck}
        onChangeNumber={onChangeNumber}
        retrying={retrying}
      />
    );
  }

  if (status === PAYMENT_STATUSES.FAILED || status === PAYMENT_STATUSES.INVALID) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-2">
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
          <XCircle size={20} className="text-red-600" aria-hidden="true" />
        </div>
        <div>
          <p className="text-ink font-semibold">Payment failed</p>
          <p className="text-muted text-sm mt-1">
            {provider === 'mpesa'
              ? "The M-Pesa payment didn't go through — the prompt may have been cancelled or timed out, the PIN was wrong, or the balance was too low. Nothing was taken. You can try again."
              : "Your payment wasn't completed. You can try again."}
          </p>
        </div>
        {onRetry && (
          <Button size="sm" loading={retrying} disabled={retrying} onClick={onRetry}>
            Try Again
          </Button>
        )}
        {onChangeNumber && <ChangeNumberLink onClick={onChangeNumber} />}
      </div>
    );
  }

  if (exhausted && reopened && redirectUrl) {
    return <PesapalFrame url={redirectUrl} onDone={finished} />;
  }

  if (exhausted) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-2">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Clock size={20} className="text-amber-600" aria-hidden="true" />
        </div>
        <div>
          <p className="text-ink font-semibold">{errorMessage ? "Couldn't check your payment" : 'Still confirming your payment'}</p>
          {errorMessage && <p role="alert" className="text-red-600 text-sm mt-1">{errorMessage}</p>}
          <p className="text-muted text-sm mt-1">
            {errorMessage ? '' : <>This is taking longer than usual — we haven&apos;t heard back yet.{' '}</>}
            {redirectUrl
              ? "If you haven't finished paying yet, continue to payment below. Already paid? Check again."
              : 'If you already paid, it can still land in a moment — check again. Otherwise, try again to start a fresh payment.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {redirectUrl ? (
            <Button size="sm" onClick={() => setReopened(true)}>
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

  return (
    <div className="flex flex-col items-center gap-3 text-center py-2">
      <Spinner size="lg" label="Checking payment status" />
      <p className="text-muted text-sm">Waiting for your payment to be confirmed…</p>
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
