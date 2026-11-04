import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';

/**
 * The payment transaction ledger, admin only — the "Payment Transaction Ledger" controller (live spec 2026-11-04):
 * every movement of money through M-Pesa and Pesapal, in and out, as `PaymentTransactionResponse` (type, status,
 * amount, currency, the provider's and our own reference, phone, party name, email, description, the booking /
 * payment / payout / split contribution it belongs to, the provider's message and raw callback, when) — and, since a
 * later 2026-11-04 spec, M-Pesa's own fields (`mpesaReceiptNumber` — the M-Pesa ref — `mpesaTransactionDate`,
 * `mpesaPhoneNumber`, `mpesaBalance`, `mpesaMerchantRequestId`, `mpesaCheckoutRequestId`, `mpesaResultCode`,
 * `mpesaResultDesc`), read with the callback by lib/mpesaCallback.js.
 *
 *  - `GET /admin/payment-transactions?type&status&phone&bookingId&from&to&page&size&sort` — a Spring page
 *  - `GET /admin/payment-transactions/{id}` — one transaction
 *
 * The spec lists the `type` values but not the `status` ones, so status is filtered as typed.
 */

export const TRANSACTION_TYPE_LABEL = {
  MPESA_STK: 'M-Pesa payment',
  MPESA_SPLIT_STK: 'M-Pesa split payment',
  MPESA_B2C: 'M-Pesa payout',
  PESAPAL_CARD: 'Pesapal payment',
  PESAPAL_B2C: 'Pesapal payout',
};

/** Badge colour for a transaction's `status` — matched loosely, since the spec doesn't list the values. */
export function transactionStatusVariant(status) {
  const s = String(status || '').toUpperCase();
  if (!s) return 'neutral';
  if (/SUCCESS|COMPLETE|PAID/.test(s)) return 'success';
  if (/FAIL|INVALID|CANCEL|REVERS|TIMEOUT|REJECT/.test(s)) return 'danger';
  if (/PEND|PROCESS|INITIAT/.test(s)) return 'warning';
  return 'neutral';
}

/** `SUCCESSFUL` → `Successful`. */
export const transactionStatusLabel = (status) =>
  status ? String(status).replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) : 'Unknown';

const KEY = ['admin', 'payment-transactions'];

/**
 * @param {{ type?: string, status?: string, phone?: string, bookingId?: string, from?: string, to?: string,
 *   page?: number, size?: number }} [options] — `from`/`to` as ISO date-times
 */
export function usePaymentTransactions({ type, status, phone, bookingId, from, to, page = 0, size = 20 } = {}) {
  const filters = {
    type: type || undefined,
    status: status || undefined,
    phone: phone || undefined,
    bookingId: bookingId || undefined,
    from: from || undefined,
    to: to || undefined,
  };
  return useQuery({
    queryKey: [...KEY, filters, page, size],
    queryFn: () => apiGet('/admin/payment-transactions', { ...filters, page, size, sort: 'createdAt,desc' }),
    placeholderData: keepPreviousData,
  });
}

/** One transaction, fetched fresh by id. @param {string|null} id */
export function usePaymentTransaction(id) {
  return useQuery({ queryKey: [...KEY, 'one', id], queryFn: () => apiGet(`/admin/payment-transactions/${id}`), enabled: !!id });
}
