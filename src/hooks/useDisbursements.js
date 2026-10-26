import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPatch, apiPost } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';

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
 */

export const PAYOUT_LABEL = { PENDING: 'To pay', PROCESSING: 'Processing', COMPLETED: 'Paid', FAILED: 'Failed' };
export const PAYOUT_VARIANT = { PENDING: 'warning', PROCESSING: 'info', COMPLETED: 'success', FAILED: 'danger' };

const KEY = ['admin', 'disbursements'];

/** Payouts in one status. */
export function useDisbursements(status, { enabled = true } = {}) {
  return useQuery({ queryKey: [...KEY, status], queryFn: () => apiGet('/admin/disbursements', { status }), enabled });
}

/** One booking's payout — `null` while there isn't one yet (pickup not recorded). */
export function useBookingDisbursement(bookingId, { enabled = true } = {}) {
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
    retry: false,
  });
}

/**
 * Acts on a payout: `action: 'trigger'` sends it (no reference — the system pays through the provider, `kind: 'send'`)
 * or records one paid by hand (with the payment's reference, `kind: 'manual'`); `'fail'` marks it failed with what went
 * wrong. The toast says what the backend reports back.
 */
export function useResolveDisbursement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reference, notes }) =>
      apiPost(`/admin/disbursements/${id}/${action}`, { ...(reference ? { reference } : {}), ...(notes ? { notes } : {}) }),
    onSuccess: (updated, { action, kind }) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      if (action === 'fail') return toast.success('Payout marked as failed.');
      if (kind === 'send') {
        const status = updated?.status;
        return toast.success(
          status === 'PROCESSING' ? 'Payout sent — it shows as Processing until the provider confirms it.'
            : status ? `Payout sent — now ${(PAYOUT_LABEL[status] || status).toLowerCase()}.` : 'Payout sent.'
        );
      }
      return toast.success('Payment recorded — payout marked as paid.');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success('Payout created — it is ready to send.');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success('Payout updated.');
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
      toast.success(status ? `Payout status: ${(PAYOUT_LABEL[status] || status).toLowerCase()}.` : 'Payout status checked.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't check the payout's status.")),
  });
}
