import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost } from '../lib/api';
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
export function useDisbursements(status) {
  return useQuery({ queryKey: [...KEY, status], queryFn: () => apiGet('/admin/disbursements', { status }) });
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

/** Marks a payout paid (`action: 'trigger'`, with the payment's reference) or failed (`'fail'`, with what went wrong). */
export function useResolveDisbursement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reference, notes }) =>
      apiPost(`/admin/disbursements/${id}/${action}`, { ...(reference ? { reference } : {}), ...(notes ? { notes } : {}) }),
    onSuccess: (_d, { action }) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success(action === 'trigger' ? 'Payout marked as paid.' : 'Payout marked as failed.');
    },
  });
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
