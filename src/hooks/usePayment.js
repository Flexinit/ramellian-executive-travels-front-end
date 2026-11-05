import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { PAYMENT_POLL_INTERVAL_MS, PAYMENT_POLL_MAX_ATTEMPTS, PAYMENT_STATUSES } from '../lib/constants';

/**
 * Pesapal checkout + status polling per FRONTEND_INTEGRATION.md §4.
 * "Do not mark payment successful in the browser" — this only ever reads
 * the polled status from the backend; it never infers success locally.
 */

/**
 * Pesapal's checkout address from `PaymentCheckoutResponse`: `iframeUrl` (live spec 2026-11-04, made to be shown in a
 * frame, as PesapalFrame does) — `redirectUrl` before that. Read once here, into `redirectUrl`, so everything that
 * shows the checkout keeps working whichever the backend sends.
 */
const withCheckoutUrl = (data) => (data ? { ...data, redirectUrl: data.iframeUrl || data.redirectUrl } : data);

/**
 * Starts Pesapal checkout. Does not redirect on its own — `redirectUrl` is only returned to the caller;
 * PaymentStatusPanel is what renders it as a click-through link and, after a short delay, auto-navigates to
 * it. The mutation itself never navigates the instant the request resolves, so the renter still always sees
 * the "You're ready to pay" panel first.
 */
export function usePesapalCheckout() {
  return useMutation({
    mutationFn: (bookingId) => apiPost(`/payments/pesapal/bookings/${bookingId}/checkout`).then(withCheckoutUrl),
    onSuccess: (data, bookingId) => {
      if (data?.redirectUrl) {
        // Pesapal's own redirect back is a full page load, which loses React Router state — this is what
        // PaymentSuccessPage (the eventual landing page for that redirect) reads to know which booking to
        // check, the same way `PaymentPage.jsx` mirrors `bookingId` into sessionStorage for the same reason.
        sessionStorage.setItem('lastCheckoutBookingId', bookingId);
        // Also stashed so a renter who comes back to this page later (closed the tab, or just waited long
        // enough for polling to give up — see `pollExhausted`) still has a working "Continue to Pesapal"
        // link, not just "Check again" — this mutation's own `data` doesn't survive a remount.
        sessionStorage.setItem(`checkout-url:${bookingId}`, data.redirectUrl);
      } else {
        toast.error('Payment could not be started. Please try again.');
      }
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Could not start payment. Please try again.');
    },
  });
}

/**
 * Starts Pesapal checkout for a whole group of bookings at once (`docs/backend-requests.md` item 1, added
 * by the backend 2026-09-27) — one payment for every vehicle in a multi-vehicle selection, confirmed live to
 * need a signed-in renter (403 without a token). Same `redirectUrl` handoff to PaymentStatusPanel, and the
 * same delayed auto-redirect, as `usePesapalCheckout`.
 */
export function useGroupCheckout() {
  return useMutation({
    mutationFn: (groupId) => apiPost(`/payments/pesapal/booking-groups/${groupId}/checkout`).then(withCheckoutUrl),
    onSuccess: (data, groupId) => {
      if (data?.redirectUrl) {
        // Same reasoning as `usePesapalCheckout`'s own stash — survives a remount so "Continue to Pesapal"
        // is still offered after polling gives up, not just "Check again".
        sessionStorage.setItem(`group-checkout-url:${groupId}`, data.redirectUrl);
      } else {
        toast.error('Payment could not be started. Please try again.');
      }
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Could not start payment. Please try again.');
    },
  });
}

/**
 * Query options for one booking's Pesapal status — the shape behind `usePaymentStatus`, exposed separately
 * so a *group* payment (one combined charge, several bookings) can poll all of them at once via
 * `useQueries`: there is no `.../booking-groups/{groupId}/status` endpoint, so the group's own status is
 * read as "every booking in it reports the same settled status" (see GroupPaymentPage).
 */
export function paymentStatusKey(bookingId, provider = 'pesapal') {
  if (provider === 'mpesa' || provider === 'any') return ['payment-status', bookingId, provider];
  return ['payment-status', bookingId];
}

/** An M-Pesa prompt can sit on the renter's phone for about a minute before they enter their PIN: twice the checks. */
const MPESA_POLL_MAX_ATTEMPTS = PAYMENT_POLL_MAX_ATTEMPTS * 2;
const maxAttempts = (provider) => (provider === 'mpesa' ? MPESA_POLL_MAX_ATTEMPTS : PAYMENT_POLL_MAX_ATTEMPTS);

/**
 * @param {string} bookingId @param {boolean} [enabled]
 * @param {'pesapal'|'mpesa'|'any'} [provider] — which status to read: Pesapal's, the M-Pesa prompt's
 *   (`GET /payments/mpesa/bookings/{bookingId}/status`, live spec 2026-10-27), or whichever knows of a payment
 *   (`fetchBookingPayment` — a group whose bookings may end up paid different ways)
 * @param {{ holdFailedUntil?: number }} [options] — until this time (ms), FAILED/INVALID doesn't stop the checks: an M-Pesa
 *   prompt just sent (or re-sent through `/retry`, which reuses the payment) can still read as the last attempt's FAILED
 *   before this one has even reached the phone, so only SUCCESSFUL ends the wait early. See PaymentPage.
 */
export function paymentStatusQuery(bookingId, enabled = true, provider = 'pesapal', { holdFailedUntil = 0 } = {}) {
  return {
    queryKey: paymentStatusKey(bookingId, provider),
    queryFn: () =>
      provider === 'any'
        ? fetchBookingPayment(bookingId)
        : apiGet(`/payments/${provider === 'mpesa' ? 'mpesa' : 'pesapal'}/bookings/${bookingId}/status`),
    enabled: enabled && !!bookingId,
    // Back on the page (from the M-Pesa prompt, Pesapal in another tab, the banking app) → check straight away, rather
    // than waiting for the next tick or, once the checks have run out, for the renter to press Check again.
    refetchOnWindowFocus: 'always',
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const attempts = query.state.dataUpdateCount;
      // A failure isn't final while it may still be the last attempt's (see `holdFailedUntil`): keep checking.
      const failed = status === PAYMENT_STATUSES.FAILED || status === PAYMENT_STATUSES.INVALID;
      const settled = status === PAYMENT_STATUSES.SUCCESSFUL || (failed && Date.now() >= holdFailedUntil);
      if (settled || attempts >= maxAttempts(provider)) return false;
      return PAYMENT_POLL_INTERVAL_MS;
    },
  };
}

/**
 * Pays a booking by M-Pesa prompt (STK push) — `POST /payments/mpesa/bookings/{bookingId}/checkout?phone=` →
 * `PaymentCheckoutResponse` (live spec 2026-10-27). Safaricom sends a prompt to `phone`; the renter enters their PIN
 * there, and the result is read from the M-Pesa status (`usePaymentStatus(…, 'mpesa')`). `phone` is sent the way
 * Safaricom writes numbers, 2547XXXXXXXX (docs/backend-requests.md item 55).
 */
export function useMpesaCheckout() {
  return useMutation({
    mutationFn: ({ bookingId, phone }) =>
      apiPost(`/payments/mpesa/bookings/${bookingId}/checkout?phone=${encodeURIComponent(String(phone).replace(/^\+/, ''))}`),
    onSuccess: (_, { bookingId }) => {
      sessionStorage.setItem(`checkout-provider:${bookingId}`, 'mpesa');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Could not send the M-Pesa prompt. Please try again.');
    },
  });
}

/** Most useful first when both providers answer: paid, then still going, then whatever's left (failed/invalid). */
const STATUS_RANK = { [PAYMENT_STATUSES.SUCCESSFUL]: 0, [PAYMENT_STATUSES.PENDING]: 1 };
const rank = (p) => STATUS_RANK[p?.status] ?? 2;

/**
 * Sends the M-Pesa prompt again for a booking whose M-Pesa payment is PENDING or FAILED —
 * `POST /payments/mpesa/bookings/{bookingId}/retry?phone=` → `PaymentCheckoutResponse` (live spec 2026-11-05). Reuses
 * that payment rather than starting a second one; `phone` (optional, `2547…`) sends it to a different number. Rejects
 * with the backend's error — a 404 when there's no M-Pesa payment to retry, which the caller answers with a fresh
 * checkout (`useMpesaCheckout`). No toast here: the caller decides what a failure means.
 */
export function useMpesaRetry() {
  return useMutation({
    mutationFn: ({ bookingId, phone }) =>
      apiPost(`/payments/mpesa/bookings/${bookingId}/retry${phone ? `?phone=${encodeURIComponent(String(phone).replace(/^\+/, ''))}` : ''}`),
    onSuccess: (_, { bookingId }) => {
      sessionStorage.setItem(`checkout-provider:${bookingId}`, 'mpesa');
    },
  });
}

/**
 * A booking's payment whichever way it was paid — Pesapal, an M-Pesa prompt or a split (whose payment the M-Pesa
 * status reports). There's no one status endpoint for every provider (docs/backend-requests.md item 55), so both are
 * asked at once and the most useful answer wins, tagged `via` with the provider that gave it. A booking neither knows
 * of rejects with the Pesapal error (a 404 "Payment not found"), as asking Pesapal alone used to.
 */
export async function fetchBookingPayment(bookingId) {
  const [pesapal, mpesa] = await Promise.allSettled([
    apiGet(`/payments/pesapal/bookings/${bookingId}/status`).then((p) => p && { ...p, via: 'pesapal' }),
    apiGet(`/payments/mpesa/bookings/${bookingId}/status`).then((p) => p && { ...p, via: 'mpesa' }),
  ]);
  const found = [pesapal, mpesa].filter((r) => r.status === 'fulfilled' && r.value?.status).map((r) => r.value);
  if (found.length === 0) throw pesapal.reason ?? mpesa.reason ?? new Error('Payment not found');
  return found.sort((a, b) => rank(a) - rank(b))[0];
}

/** Shares the `payment-status` prefix, so invalidating or removing a booking's status reaches this lookup too. */
const bookingPaymentKey = (bookingId) => paymentStatusKey(bookingId, 'any');

/**
 * A one-shot (non-polling) check for whether `bookingId` already has a payment record — used to resume the
 * normal status view (`usePaymentStatus`) when the local "checkout started" flag has been lost: a
 * different browser or origin, cleared storage, or (docs/backend-requests.md item 21) Pesapal's own
 * redirect landing somewhere other than where checkout began. Without this, a renter in that situation
 * would be shown "Proceed to Payment" again with no way to tell they (maybe) already have, and clicking
 * it would start an entirely separate checkout rather than picking up the one already in progress or done.
 *
 * Deliberately not just reusing `usePaymentStatus` with `enabled: true` outright: a booking that has never
 * been checked out at all answers this 404 ("Payment not found"), and `usePaymentStatus`'s own
 * `refetchInterval` would otherwise keep re-asking that forever (its "give up after N attempts" counter
 * only advances on a *successful* response). This checks once (`retry: false`, no polling), with
 * `fetchBookingPayment`, so a booking paid by M-Pesa or a split is found too; `via` says which provider's status
 * to keep polling.
 */
export function useExistingPaymentCheck(bookingId, enabled = true) {
  const active = enabled && !!bookingId;
  const query = useQuery({
    queryKey: bookingPaymentKey(bookingId),
    queryFn: () => fetchBookingPayment(bookingId),
    enabled: active,
    retry: false,
  });
  // `isLoading` so a caller gating on "is this actually paid" (e.g. VehicleHandoverModal, before letting
  // a car be collected) can tell "still checking" apart from "checked, and there's no successful payment"
  // — both otherwise look identical from `status` alone (undefined either way).
  return { status: query.data?.status, via: query.data?.via, isLoading: active && query.isLoading };
}

/**
 * A booking's receipt — the same one-shot, non-polling read as `useExistingPaymentCheck` (and sharing its
 * query key, so a receipt opened right after paying reuses the status check that already ran rather than
 * fetching it again), but returning the whole `PaymentStatusResponse` rather than just `status`: `amount`
 * (what was actually paid — the only figure a renter-facing receipt shows; see `ReceiptActions`'s own note
 * on why `platformFee`/`transactionFee` never appear on it), `provider`, `orderTrackingId`, and the backend's
 * own `receipt` field. That field is typed as a plain string in the spec with no further description — this
 * wasn't confirmable against a real successful payment while building it (the backend was unreachable), so
 * `Receipt.jsx` treats it defensively (rendered as a link only if it actually looks like a URL).
 * @param {string} bookingId
 * @param {boolean} [enabled] — pass `false` for a booking whose own `status` couldn't have a payment yet
 *   (e.g. still PENDING), so a long list of bookings doesn't fire one doomed-to-404 request per unpaid row.
 */
export function useBookingReceipt(bookingId, enabled = true) {
  const active = enabled && !!bookingId;
  const query = useQuery({
    queryKey: bookingPaymentKey(bookingId),
    queryFn: () => fetchBookingPayment(bookingId),
    enabled: active,
    retry: false,
  });
  const successful = query.data?.status === PAYMENT_STATUSES.SUCCESSFUL;
  return { receipt: successful ? query.data : null, isLoading: active && query.isLoading };
}

/** Same one-shot check as `useExistingPaymentCheck`, for every booking in a group at once
 * (`GroupPaymentPage`) — one `useQueries` call rather than one hook per item. */
export function useExistingPaymentChecks(bookingIds, enabled = true) {
  const results = useQueries({
    queries: (bookingIds || []).map((id) => ({
      queryKey: bookingPaymentKey(id),
      queryFn: () => fetchBookingPayment(id),
      enabled: enabled && !!id,
      retry: false,
    })),
  });
  return results.map((r) => ({ status: r.data?.status }));
}

/** Whether `bookingId`'s status polling has used up its attempts without ever reaching a settled status —
 * i.e. Pesapal (or the backend's own callback wiring) never confirmed one way or the other. `dataUpdateCount`
 * is read straight from the query cache rather than tracked separately, so it stays in lockstep with the
 * exact same attempts `paymentStatusQuery`'s own `refetchInterval` just gave up counting. */
function pollExhausted(queryClient, bookingId, status, provider = 'pesapal') {
  const settled = status === PAYMENT_STATUSES.SUCCESSFUL || status === PAYMENT_STATUSES.FAILED || status === PAYMENT_STATUSES.INVALID;
  if (settled) return false;
  const attempts = queryClient.getQueryState(paymentStatusKey(bookingId, provider))?.dataUpdateCount ?? 0;
  return attempts >= maxAttempts(provider);
}

/**
 * Polls payment status every `PAYMENT_POLL_INTERVAL_MS`, stopping once the
 * backend reports SUCCESSFUL/FAILED/INVALID or after
 * `PAYMENT_POLL_MAX_ATTEMPTS` polls — whichever comes first. `exhausted` tells the caller it's the latter:
 * still no answer after every attempt, most often because Pesapal's callback to the backend never landed
 * (wrong `PESAPAL_CALLBACK_URL`, network issue, etc.) — worth surfacing distinctly from "still checking",
 * since an indefinite spinner with no explanation looks identical to a page that's simply broken.
 * A status check that errors (e.g. the backend's own call to Pesapal failing — seen live as a 500 "invalid
 * consumer key or secret") counts as exhausted too, with `errorMessage` saying why: an error never advances
 * the attempt count, so the page otherwise spun on "Waiting for your payment…" forever.
 *
 * @param {string} bookingId
 * @param {boolean} enabled
 * @param {'pesapal'|'mpesa'} [provider]
 */
export function usePaymentStatus(bookingId, enabled = true, provider = 'pesapal', options) {
  const queryClient = useQueryClient();
  const query = useQuery(paymentStatusQuery(bookingId, enabled, provider, options));
  const failedToCheck = query.isError && !query.data;
  return {
    ...query,
    exhausted: enabled && (failedToCheck || pollExhausted(queryClient, bookingId, query.data?.status, provider)),
    errorMessage: enabled && failedToCheck ? apiErrorMessage(query.error, "We couldn't check your payment.") : '',
  };
}

/** Same "gave up without an answer" check as `usePaymentStatus`, for a group payment polling several
 * bookings at once via `useQueries` (see GroupPaymentPage) rather than this single-booking hook. */
export function useGroupPollExhausted(bookingIds, statuses, enabled, provider = 'pesapal') {
  const queryClient = useQueryClient();
  if (!enabled || bookingIds.length === 0) return false;
  return bookingIds.every((id, i) => pollExhausted(queryClient, id, statuses[i], provider));
}

/**
 * Pays a booking's overstay charge (a late return, `BookingResponse.overstayAmount`) through Pesapal —
 * `POST /payments/pesapal/bookings/{bookingId}/overstay-checkout` → `PaymentCheckoutResponse` (live spec 2026-10-16),
 * whose `redirectUrl` is paid in a dialog on the page (OverstayPaymentModal). Pass the `bookingId`.
 */
export function useOverstayCheckout() {
  return useMutation({
    mutationFn: (bookingId) => apiPost(`/payments/pesapal/bookings/${bookingId}/overstay-checkout`).then(withCheckoutUrl),
    onSuccess: (data, bookingId) => {
      if (!data?.redirectUrl) {
        toast.error('The overstay payment could not be started. Please try again.');
        return;
      }
      sessionStorage.setItem('lastCheckoutBookingId', bookingId);
      // Paid in a frame on the page (BookingRow's dialog, PesapalFrame) — the browser no longer leaves for Pesapal.
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Could not start the overstay payment. Please try again.'),
  });
}
