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
 * Starts Pesapal checkout. Does not redirect on its own — `redirectUrl` is only returned to the caller;
 * PaymentStatusPanel is what renders it as a click-through link and, after a short delay, auto-navigates to
 * it. The mutation itself never navigates the instant the request resolves, so the renter still always sees
 * the "You're ready to pay" panel first.
 */
export function usePesapalCheckout() {
  return useMutation({
    mutationFn: (bookingId) => apiPost(`/payments/pesapal/bookings/${bookingId}/checkout`),
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
    mutationFn: (groupId) => apiPost(`/payments/pesapal/booking-groups/${groupId}/checkout`),
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
export function paymentStatusKey(bookingId) {
  return ['payment-status', bookingId];
}

export function paymentStatusQuery(bookingId, enabled = true) {
  return {
    queryKey: paymentStatusKey(bookingId),
    queryFn: () => apiGet(`/payments/pesapal/bookings/${bookingId}/status`),
    enabled: enabled && !!bookingId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const attempts = query.state.dataUpdateCount;
      const settled = status === PAYMENT_STATUSES.SUCCESSFUL || status === PAYMENT_STATUSES.FAILED || status === PAYMENT_STATUSES.INVALID;
      if (settled || attempts >= PAYMENT_POLL_MAX_ATTEMPTS) return false;
      return PAYMENT_POLL_INTERVAL_MS;
    },
  };
}

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
 * only advances on a *successful* response). This checks once (`retry: false`, no polling) and shares
 * `paymentStatusKey` with `usePaymentStatus`, so if it does find a record, switching over to normal
 * polling for the same booking sees that answer already cached instead of fetching it twice.
 */
export function useExistingPaymentCheck(bookingId, enabled = true) {
  const active = enabled && !!bookingId;
  const query = useQuery({
    queryKey: paymentStatusKey(bookingId),
    queryFn: () => apiGet(`/payments/pesapal/bookings/${bookingId}/status`),
    enabled: active,
    retry: false,
  });
  // `isLoading` so a caller gating on "is this actually paid" (e.g. VehicleHandoverModal, before letting
  // a car be collected) can tell "still checking" apart from "checked, and there's no successful payment"
  // — both otherwise look identical from `status` alone (undefined either way).
  return { status: query.data?.status, isLoading: active && query.isLoading };
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
    queryKey: paymentStatusKey(bookingId),
    queryFn: () => apiGet(`/payments/pesapal/bookings/${bookingId}/status`),
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
      queryKey: paymentStatusKey(id),
      queryFn: () => apiGet(`/payments/pesapal/bookings/${id}/status`),
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
function pollExhausted(queryClient, bookingId, status) {
  const settled = status === PAYMENT_STATUSES.SUCCESSFUL || status === PAYMENT_STATUSES.FAILED || status === PAYMENT_STATUSES.INVALID;
  if (settled) return false;
  const attempts = queryClient.getQueryState(paymentStatusKey(bookingId))?.dataUpdateCount ?? 0;
  return attempts >= PAYMENT_POLL_MAX_ATTEMPTS;
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
 */
export function usePaymentStatus(bookingId, enabled = true) {
  const queryClient = useQueryClient();
  const query = useQuery(paymentStatusQuery(bookingId, enabled));
  const failedToCheck = query.isError && !query.data;
  return {
    ...query,
    exhausted: enabled && (failedToCheck || pollExhausted(queryClient, bookingId, query.data?.status)),
    errorMessage: enabled && failedToCheck ? apiErrorMessage(query.error, "We couldn't check your payment.") : '',
  };
}

/** Same "gave up without an answer" check as `usePaymentStatus`, for a group payment polling several
 * bookings at once via `useQueries` (see GroupPaymentPage) rather than this single-booking hook. */
export function useGroupPollExhausted(bookingIds, statuses, enabled) {
  const queryClient = useQueryClient();
  if (!enabled || bookingIds.length === 0) return false;
  return bookingIds.every((id, i) => pollExhausted(queryClient, id, statuses[i]));
}

/**
 * Pays a booking's overstay charge (a late return, `BookingResponse.overstayAmount`) through Pesapal —
 * `POST /payments/pesapal/bookings/{bookingId}/overstay-checkout` → `PaymentCheckoutResponse` (live spec 2026-10-16),
 * then straight to its `redirectUrl`. Pass the `bookingId`.
 */
export function useOverstayCheckout() {
  return useMutation({
    mutationFn: (bookingId) => apiPost(`/payments/pesapal/bookings/${bookingId}/overstay-checkout`),
    onSuccess: (data, bookingId) => {
      if (!data?.redirectUrl) {
        toast.error('The overstay payment could not be started. Please try again.');
        return;
      }
      sessionStorage.setItem('lastCheckoutBookingId', bookingId);
      window.location.assign(data.redirectUrl);
    },
    onError: (error) => toast.error(error?.response?.data?.message || 'Could not start the overstay payment. Please try again.'),
  });
}
