import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { amountToPay } from '../lib/paymentTotal';

/**
 * Split payment — a booking paid by several people, each by M-Pesa prompt (live spec 2026-10-27, "M-Pesa Payments"):
 * the renter lists who pays what; each gets a prompt on their phone; the booking is paid once everyone has.
 *
 *  - `POST /payments/mpesa/bookings/{bookingId}/split` `SplitPaymentRequest { contributors: [{ payerPhone, payerName?,
 *    payerEmail?, amount }], expiryMinutes? }` → `SplitPaymentResponse`
 *  - `GET  /payments/mpesa/bookings/{bookingId}/split` → `SplitPaymentResponse` (group status, total / paid /
 *    outstanding, when it expires, and each contribution's status and receipt) — 404 while there is none
 *  - `POST /payments/mpesa/bookings/{bookingId}/split/contributions/{contributionId}/retry` — sends that person's prompt
 *    again
 */

const key = (bookingId) => ['split-payment', bookingId];

/*
 * Statuses (backend, 2026-10-27): the group (`SplitPaymentGroupStatus`) is PENDING → PARTIAL (some have paid) →
 * COMPLETE, or EXPIRED / CANCELLED; each person (`SplitContributionStatus`) is PENDING → PROCESSING (they entered their
 * PIN, M-Pesa is confirming) → PAID, or FAILED. An expired group is not refunded automatically
 * (docs/backend-requests.md item 57).
 */

/** Everyone has paid. */
export function splitIsPaid(split) {
  if (!split) return false;
  return split.groupStatus === 'COMPLETE' || (Number(split.totalAmount) > 0 && Number(split.totalOutstanding) <= 0);
}
/** The split is over, one way or the other: paid in full, or it ran out / was cancelled. */
export function splitIsClosed(split) {
  return splitIsPaid(split) || ['EXPIRED', 'CANCELLED'].includes(split?.groupStatus);
}
/** One person's share is paid. */
export const contributionPaid = (c) => c?.status === 'PAID';
/** One person has entered their PIN and M-Pesa is confirming it — not the moment to send another prompt. */
export const contributionConfirming = (c) => c?.status === 'PROCESSING';

/**
 * What a split's shares must add up to (backend, 2026-10-27): the booking's whole charge — the rental (`baseAmount`),
 * the delivery fee and driver charge, and the processing fee, which for M-Pesa is the payment (STK) fee plus the payout
 * (B2C) fee from Platform Settings. Payers pay nothing on top of their share. The backend allows KES 1 for rounding.
 * Falls back to `estimatedAmount` when the booking doesn't give its rental amount.
 *
 * @param {object} [booking] — `BookingResponse` @param {object} [settings] — `PlatformSettingsResponse`
 * @returns {{ total: number, lines: { label: string, amount: number }[] }}
 */
export function splitTotal(booking, settings, vehicle) {
  // The same total the Payment page shows for paying by M-Pesa (lib/paymentTotal.js), in whole shillings.
  const { lines, total } = amountToPay(booking, vehicle, settings, 'split');
  return { total: Math.round(total), lines };
}

/** A booking's split payment (`null` while there is none), checked every few seconds until it's closed. */
export function useSplitPayment(bookingId, { enabled = true } = {}) {
  return useQuery({
    queryKey: key(bookingId),
    queryFn: async () => {
      try {
        return await apiGet(`/payments/mpesa/bookings/${bookingId}/split`);
      } catch (error) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: enabled && !!bookingId,
    retry: false,
    refetchInterval: (query) => (query.state.data && !splitIsClosed(query.state.data) ? 4000 : false),
  });
}

/** Starts a split: `{ bookingId, contributors, expiryMinutes }`; phone numbers are sent as Safaricom writes them. */
export function useStartSplit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, contributors, expiryMinutes }) =>
      apiPost(`/payments/mpesa/bookings/${bookingId}/split`, {
        contributors: contributors.map((c) => ({
          payerPhone: String(c.payerPhone).replace(/^\+/, ''),
          amount: Number(c.amount),
          ...(c.payerName ? { payerName: c.payerName } : {}),
          ...(c.payerEmail ? { payerEmail: c.payerEmail } : {}),
        })),
        ...(expiryMinutes ? { expiryMinutes } : {}),
      }),
    onSuccess: (split, { bookingId }) => {
      sessionStorage.setItem(`checkout-provider:${bookingId}`, 'split');
      queryClient.setQueryData(key(bookingId), split);
    },
  });
}

/** Sends one person's prompt again: `{ bookingId, contributionId }`. */
export function useRetryContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, contributionId }) =>
      apiPost(`/payments/mpesa/bookings/${bookingId}/split/contributions/${contributionId}/retry`),
    onSuccess: (split, { bookingId }) => {
      if (split) queryClient.setQueryData(key(bookingId), split);
      toast.success('Prompt sent again.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't send the prompt again.")),
  });
}

/**
 * `total` shared between `count` people in whole shillings, the remainder (if any) on the first — so the shares
 * always add up to exactly the total.
 * @returns {number[]}
 */
export function splitEqually(total, count) {
  const t = Math.round(Number(total) || 0);
  if (count < 1) return [];
  const each = Math.floor(t / count);
  return Array.from({ length: count }, (_, i) => each + (i === 0 ? t - each * count : 0));
}
