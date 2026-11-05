import React from 'react';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { DetailList, DetailRow } from '../ui/DetailList';
import {
  TRANSACTION_TYPE_LABEL,
  transactionStatusLabel,
  transactionStatusVariant,
  usePaymentTransaction,
} from '../../hooks/usePaymentTransactions';
import { mpesaDetails } from '../../lib/mpesaCallback';
import { formatCurrency, formatDateTime } from '../../lib/utils';

const rows = (t, ref) =>
  [
    ['M-Pesa ref', ref && <span className="font-semibold tracking-wide">{ref}</span>],
    ['Type', TRANSACTION_TYPE_LABEL[t.type] || t.type],
    ['Amount', t.amount != null && `${formatCurrency(Number(t.amount) || 0)}${t.currency && t.currency !== 'KES' ? ` (${t.currency})` : ''}`],
    ['When', formatDateTime(t.createdAt)],
    ['Last updated', t.lastModifiedAt && t.lastModifiedAt !== t.createdAt && formatDateTime(t.lastModifiedAt)],
    ['Name', t.partyName],
    ['Phone', t.phone],
    ['Email', t.email],
    // The booking's renter (live spec 2026-11-05) — shown when it isn't already the person above: a split payer paying
    // for a friend's booking, or the owner a payout went to.
    ['Renter', t.renterName && t.renterName !== t.partyName && t.renterName],
    ['Renter phone', t.renterPhone && t.renterPhone !== t.phone && t.renterPhone],
    ['Description', t.description],
    ['Provider reference', t.providerReference],
    ['Our reference', t.internalReference],
    ['Provider message', t.providerMessage],
    [
      'Booking',
      t.bookingId && (
        <Link to={`/admin/bookings/${t.bookingId}`} className="text-accent hover:underline focus-ring rounded">
          Open the booking
        </Link>
      ),
    ],
    ['Payment ID', t.paymentId],
    ['Payout ID', t.disbursementId],
    ['Split contribution ID', t.splitContributionId],
    ['Transaction ID', t.id],
  ].filter(([, value]) => value);

/** The callback indented when it's JSON (it usually is), as sent otherwise. */
function pretty(raw) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

/**
 * One payment transaction, fetched by id (`GET /admin/payment-transactions/{id}`): the M-Pesa ref first, the ledger's
 * own fields, then every field of the provider's callback (M-Pesa's STK or B2C payload), with the raw callback kept at
 * the bottom for support. Open while `id` is set.
 *
 * @param {string|null} id
 * @param {function} onClose
 */
export default function PaymentTransactionDetailModal({ id, onClose }) {
  const { data: t, isLoading, isError } = usePaymentTransaction(id);
  const payload = mpesaDetails(t);
  const isMpesa = String(t?.type || '').startsWith('MPESA') || (payload && payload.kind !== 'other');

  return (
    <Modal isOpen={!!id} onClose={onClose} title={t ? TRANSACTION_TYPE_LABEL[t.type] || 'Transaction' : 'Transaction'} size="md">
      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner size="lg" label="Loading transaction" />
        </div>
      )}
      {isError && <p className="text-sm text-red-600">Couldn&apos;t load this transaction.</p>}
      {t && (
        <div className="flex flex-col gap-4">
          <Badge label={transactionStatusLabel(t.status)} variant={transactionStatusVariant(t.status)} className="self-start" />
          <DetailList>
            {rows(t, isMpesa && payload?.ref).map(([label, value]) => (
              <DetailRow key={label} label={label}>{value}</DetailRow>
            ))}
          </DetailList>
          {/* Every field the provider sent, read out of its callback (lib/mpesaCallback.js). */}
          {payload?.fields.length > 0 && (
            <section aria-labelledby="provider-payload" className="flex flex-col gap-2">
              <h3 id="provider-payload" className="font-heading text-ink text-sm font-semibold">
                {isMpesa ? 'M-Pesa details' : 'Provider details'}
              </h3>
              <DetailList>
                {payload.fields.map((field) => (
                  <DetailRow key={field.key} label={field.label}>{field.value}</DetailRow>
                ))}
              </DetailList>
            </section>
          )}
          {t.rawCallback && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted focus-ring rounded">Provider&apos;s raw callback</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-tile border border-line bg-ink/[0.03] p-3 whitespace-pre-wrap break-all">
                {pretty(t.rawCallback)}
              </pre>
            </details>
          )}
        </div>
      )}
    </Modal>
  );
}
