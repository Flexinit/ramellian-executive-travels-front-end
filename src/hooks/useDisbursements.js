import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch, apiPost } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { postPayoutNotice, startPayoutWatch, toneFor } from './usePayoutNotice';

/**
 * Owner payouts — `disbursement-controller` (live spec 2026-10-26), admin only. A payout (`DisbursementResponse`:
 * vehicle, owner, amount, status, who triggered it and when, reference, notes) is **created by the backend when the
 * vehicle's pickup is recorded** — there is no endpoint to create one (checked live: a paid, completed booking with no
 * pickup on record answers `404 "Disbursement not yet created for this booking — pickup may not have occurred"`).
 *
 *  - `GET /admin/disbursements?status=PENDING|PROCESSING|COMPLETED|FAILED` — the list
 *  - `GET /admin/disbursements/bookings/{bookingId}` — one booking's payout (404 until pickup is recorded)
 *  - `POST /admin/disbursements/{id}/trigger` `{ reference, notes? }` — marked paid
 *  - `POST /admin/disbursements/{id}/fail` `{ reference?, notes }` — marked failed
 *  - `POST /admin/disbursements/{id}/sync` — a PROCESSING payout's latest status from the payment provider
 *  - `POST /admin/disbursements/{id}/query-status` — asks Safaricom what happened to it (local spec 2026-11-13)
 *  - `PATCH /admin/disbursements/{id}/status?status=&receipt=` — sets its status by hand (local spec 2026-11-13)
 *
 * Results show as a banner that stays until dismissed (`usePayoutNotice`), not a toast that fades — these are money.
 */

export const PAYOUT_LABEL = { PENDING: 'To pay', PROCESSING: 'Processing', COMPLETED: 'Paid', FAILED: 'Failed' };
export const PAYOUT_VARIANT = { PENDING: 'warning', PROCESSING: 'info', COMPLETED: 'success', FAILED: 'danger' };

const KEY = ['admin', 'disbursements'];

/** Payouts in one status. */
export function useDisbursements(status, { enabled = true } = {}) {
  return useQuery({ queryKey: [...KEY, status], queryFn: () => apiGet('/admin/disbursements', { status }), enabled });
}

/**
 * One booking's payout — `null` while there isn't one yet (pickup not recorded). `refetchInterval` re-reads it while
 * re-reading it on a schedule.
 */
export function useBookingDisbursement(bookingId, { enabled = true, refetchInterval = false } = {}) {
  return useQuery({
    queryKey: [...KEY, 'booking', bookingId],
    queryFn: async () => {
      try {
        return await apiGet(`/admin/disbursements/bookings/${bookingId}`);
      } catch (error) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!bookingId && enabled,
    refetchInterval,
    retry: false,
  });
}

/**
 * Acts on a payout: `action: 'trigger'` sends it (no reference — the system pays through the provider, `kind: 'send'`)
 * or records one paid by hand (with the payment's reference, `kind: 'manual'`); `'fail'` marks it failed with what went
 * wrong. A payout sent through the provider starts the 60-second wait for Safaricom (`startPayoutWatch`); the rest say
 * what the backend reports back, in the banner.
 */
export function useResolveDisbursement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reference, notes }) =>
      apiPost(`/admin/disbursements/${id}/${action}`, { ...(reference ? { reference } : {}), ...(notes ? { notes } : {}) }),
    onSuccess: (updated, { id, action, kind, reference, payout }) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      const p = { ...(payout || { id }), ...(updated || {}) };
      if (action === 'fail') return postPayoutNotice(queryClient, { payout: p, tone: 'warning', title: 'Payout marked as failed', message: p.notes || null });
      if (kind === 'send') return startPayoutWatch(queryClient, [{ ...p, status: p.status || 'PROCESSING' }]);
      return postPayoutNotice(queryClient, {
        payout: p, tone: 'success', title: 'Payment recorded',
        message: `Marked as paid by hand${reference ? ` (ref ${reference})` : ''}. Nothing was sent from the portal.`,
      });
    },
  });
}

const cleanBody = ({ amount, ownerPhone, notes }) => ({
  ...(amount !== '' && amount != null ? { amount: Number(amount) } : {}),
  ...(ownerPhone ? { ownerPhone } : {}),
  ...(notes ? { notes } : {}),
});

/**
 * Creates a payout by hand for a booking that has none — when the automatic one never happened (no pickup recorded,
 * a booking from before payouts existed): `POST /admin/disbursements/bookings/{bookingId}` `ManualDisbursementRequest
 * { amount?, ownerPhone?, notes? }` → 201 `DisbursementResponse` (live spec 2026-10-26). It starts To pay.
 */
export function useCreateDisbursement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, ...fields }) => apiPost(`/admin/disbursements/bookings/${bookingId}`, cleanBody(fields)),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      postPayoutNotice(queryClient, { payout: created, tone: 'success', title: 'Payout created', message: "It's under To pay, ready to send." });
    },
  });
}

/**
 * Corrects a payout before it's sent or retried — the owner's phone (where an M-Pesa payout goes), the amount, notes:
 * `PATCH /admin/disbursements/{id}` `UpdateDisbursementRequest` (live spec 2026-10-26).
 */
export function useUpdateDisbursement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...fields }) => apiPatch(`/admin/disbursements/${id}`, cleanBody(fields)),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      postPayoutNotice(queryClient, { payout: updated, tone: 'success', title: 'Payout updated', message: null });
    },
  });
}

/** The signed-in owner's own payouts — `GET /owner/disbursements` → `DisbursementResponse[]` (live spec 2026-10-26). */
export function useMyDisbursements() {
  return useQuery({ queryKey: ['owner', 'disbursements'], queryFn: () => apiGet('/owner/disbursements'), retry: false });
}

/** Asks the payment provider for a processing payout's latest status. */
export function useSyncDisbursement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiPost(`/admin/disbursements/${id}/sync`),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      const status = updated?.status;
      postPayoutNotice(queryClient, {
        payout: updated, tone: toneFor(status),
        title: status ? `Payout status: ${(PAYOUT_LABEL[status] || status).toLowerCase()}` : 'Payout status checked',
        message: updated?.reference && status === 'COMPLETED' ? `M-Pesa ref ${updated.reference}.` : null,
      });
    },
    onError: (error) => postPayoutNotice(queryClient, { tone: 'danger', title: "Couldn't check the payout's status", message: apiErrorMessage(error, 'Please try again.') }),
  });
}

const QUERY_WORD = { PENDING: 'not sent yet', PROCESSING: 'still processing', COMPLETED: 'paid', FAILED: 'failed' };

/**
 * Asks Safaricom directly what happened to a payout — `POST /admin/disbursements/{id}/query-status` →
 * `DisbursementResponse` (local spec 2026-11-13). For a payout stuck as Processing (the B2C result never came back),
 * and before **Try again** on a failed one, so an owner whose earlier payout actually went through isn't paid twice.
 * How it differs from `.../sync` isn't documented (docs/backend-requests.md item 70).
 */
export function useQueryDisbursementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiPost(`/admin/disbursements/${id}/query-status`),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      const status = updated?.status;
      postPayoutNotice(queryClient, {
        payout: updated, tone: toneFor(status),
        title: status ? `Safaricom says this payout is ${QUERY_WORD[status] || status.toLowerCase()}` : 'Checked with Safaricom',
        message: updated?.reference && status === 'COMPLETED' ? `M-Pesa ref ${updated.reference}.` : status === 'FAILED' ? updated?.notes || null : null,
      });
    },
    onError: (error) => postPayoutNotice(queryClient, { tone: 'danger', title: "Couldn't check this payout with Safaricom", message: apiErrorMessage(error, 'Please try again.') }),
  });
}

/**
 * Sets a payout's status by hand (admin only) — `PATCH /admin/disbursements/{id}/status?status=&receipt=` →
 * `DisbursementResponse` (local spec 2026-11-13). `status` is a plain string in the spec; the portal sends the payout
 * statuses it reads back (`COMPLETED`, `FAILED`, `PENDING`). `receipt` is the M-Pesa confirmation code, which the portal
 * requires for COMPLETED so a payout is never marked paid without proof.
 */
export function useOverrideDisbursementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, receipt }) => {
      const query = new URLSearchParams({ status });
      if (receipt) query.set('receipt', receipt);
      return apiPatch(`/admin/disbursements/${id}/status?${query}`);
    },
    onSuccess: (updated, { status }) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      const now = updated?.status || status;
      postPayoutNotice(queryClient, {
        payout: updated, tone: toneFor(now), title: `Payout status set to ${(PAYOUT_LABEL[now] || now).toLowerCase()}`,
        message: now === 'COMPLETED' && updated?.reference ? `M-Pesa ref ${updated.reference}.` : null,
      });
    },
  });
}

/**
 * Batch payouts: sends several payouts through the provider (`kind: 'send'`), or records them all as paid by hand with
 * one shared reference (`kind: 'manual'`, e.g. a bulk bank transfer). There's no batch endpoint (docs/backend-requests.md
 * item 50), so it's the same `POST /admin/disbursements/{id}/trigger` once per payout, one after the other — one that
 * fails doesn't stop the rest. Resolves to `{ done: [{ payout, updated }], failed: [{ payout, message }] }`;
 * `onProgress(n)` after each.
 */
export function useBatchResolveDisbursements() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ payouts, kind, reference, notes, onProgress }) => {
      const done = [];
      const failed = [];
      for (const payout of payouts) {
        try {
          const body = { ...(kind === 'manual' && reference ? { reference } : {}), ...(notes ? { notes } : {}) };
          done.push({ payout, updated: await apiPost(`/admin/disbursements/${payout.id}/trigger`, body) });
        } catch (error) {
          failed.push({ payout, message: apiErrorMessage(error, "Couldn't update this payout.") });
        }
        onProgress?.(done.length + failed.length);
      }
      return { done, failed };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
