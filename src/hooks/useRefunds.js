import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';

/**
 * Refunds of a booking's rental payment, admin only — the "Refunds" controller (live spec 2026-10-27). A refund
 * (`RefundResponse`: booking, vehicle, amount, reason, status, Pesapal's refund tracking id, who started it, when) is
 * started through Pesapal and can be settled by hand when Pesapal doesn't report back.
 *
 *  - `GET /admin/refunds?status=PENDING|PROCESSING|COMPLETED|FAILED` — the list
 *  - `GET /admin/refunds/booking/{bookingId}` — a booking's refund (404 while there is none)
 *  - `POST /admin/refunds/booking/{bookingId}` `RefundRequest { amount?, reason? }` → 201 — start one through Pesapal
 *  - `POST /admin/refunds/{id}/complete` / `.../fail` — settle it by hand
 */

export const REFUND_LABEL = { PENDING: 'Pending', PROCESSING: 'Processing', COMPLETED: 'Refunded', FAILED: 'Failed' };
export const REFUND_VARIANT = { PENDING: 'warning', PROCESSING: 'info', COMPLETED: 'success', FAILED: 'danger' };

const KEY = ['admin', 'refunds'];

/** Refunds in one status (all of them when `status` is left out). */
export function useRefunds(status) {
  return useQuery({ queryKey: [...KEY, status || 'all'], queryFn: () => apiGet('/admin/refunds', status ? { status } : undefined) });
}

/** A booking's refund — `null` while there isn't one. */
export function useBookingRefund(bookingId, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...KEY, 'booking', bookingId],
    queryFn: async () => {
      try {
        return await apiGet(`/admin/refunds/booking/${bookingId}`);
      } catch (error) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!bookingId && enabled,
    retry: false,
  });
}

/** Starts a refund through Pesapal: `{ bookingId, amount?, reason? }` — no amount refunds the whole rental payment. */
export function useRequestRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, amount, reason }) =>
      apiPost(`/admin/refunds/booking/${bookingId}`, {
        ...(amount !== '' && amount != null ? { amount: Number(amount) } : {}),
        ...(reason ? { reason } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success('Refund started — Pesapal will confirm it.');
    },
  });
}

/** Settles a refund by hand: `action` is `'complete'` or `'fail'`. */
export function useSettleRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }) => apiPost(`/admin/refunds/${id}/${action}`),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success(action === 'complete' ? 'Refund marked as refunded.' : 'Refund marked as failed.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't update the refund.")),
  });
}
