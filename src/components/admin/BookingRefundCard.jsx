import React, { useState } from 'react';
import { Undo2 } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import ErrorBanner from '../ui/ErrorBanner';
import { DetailList, DetailRow } from '../ui/DetailList';
import RefundActions from './RefundActions';
import { REFUND_LABEL, REFUND_VARIANT, useBookingRefund, useRequestRefund } from '../../hooks/useRefunds';
import { useBookingReceipt } from '../../hooks/usePayment';
import { apiErrorMessage } from '../../lib/apiError';
import { formatCurrency, formatDateTime } from '../../lib/utils';

/**
 * A booking's refund, on the admin's booking page (`GET /admin/refunds/booking/{bookingId}`). A booking that was paid
 * for and has no refund yet offers **Refund payment** (`POST /admin/refunds/booking/{bookingId}`): up to what was
 * actually paid (the payment's `amount`), with a reason — required here, so every refund says why.
 *
 * @param {object} booking — `BookingResponse`
 */
export default function BookingRefundCard({ booking }) {
  const { data: refund, isLoading, isError, error, refetch } = useBookingRefund(booking.id);
  const { receipt } = useBookingReceipt(booking.id);
  const request = useRequestRefund();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [problems, setProblems] = useState({});

  const paid = receipt?.amount != null ? Number(receipt.amount) : null;
  // Nothing was paid (or it can't be read): nothing to refund, and nothing to show.
  if (!refund && !isLoading && !isError && paid == null) return null;

  function start() {
    setAmount('');
    setReason('');
    setProblems({});
    request.reset();
    setOpen(true);
  }

  function submit(e) {
    e.preventDefault();
    const next = {};
    const n = Number(amount);
    if (amount !== '' && (Number.isNaN(n) || n <= 0)) next.amount = 'Enter an amount above 0, or leave it empty to refund it all.';
    else if (amount !== '' && paid != null && n > paid) next.amount = `It can't be more than was paid (${formatCurrency(paid)}).`;
    if (!reason.trim()) next.reason = 'Say why this booking is being refunded.';
    setProblems(next);
    if (Object.keys(next).length) return;
    request.mutate({ bookingId: booking.id, amount, reason: reason.trim() }, { onSuccess: () => setOpen(false) });
  }

  return (
    <Card className="p-5 flex flex-col gap-4" aria-label="Refund">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-heading text-ink text-base font-semibold inline-flex items-center gap-2">
          <Undo2 size={16} className="text-accent" aria-hidden="true" />
          Refund
        </h2>
        {refund && <Badge label={REFUND_LABEL[refund.status] || refund.status} variant={REFUND_VARIANT[refund.status] || 'neutral'} />}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner label="Loading the refund" /></div>
      ) : isError ? (
        <ErrorBanner message={apiErrorMessage(error, 'Could not load the refund.')} onRetry={refetch} />
      ) : refund ? (
        <>
          <DetailList>
            <DetailRow label="Amount" valueClassName="font-semibold tabular-nums">{formatCurrency(Math.round(Number(refund.amount) || 0))}</DetailRow>
            <DetailRow label="Reason" stacked hidden={!refund.reason}>{refund.reason}</DetailRow>
            <DetailRow label="Started" hidden={!refund.createdAt}>
              {refund.createdAt && formatDateTime(refund.createdAt)}{refund.initiatedBy ? ` by ${refund.initiatedBy}` : ''}
            </DetailRow>
            <DetailRow label="Pesapal reference" hidden={!refund.pesapalRefundTrackingId}>{refund.pesapalRefundTrackingId}</DetailRow>
          </DetailList>
          <div className="flex flex-wrap gap-2"><RefundActions refund={refund} /></div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Paid {formatCurrency(Math.round(paid))}. A refund goes back to the renter through Pesapal.
          </p>
          <Button size="sm" variant="outline" className="self-start" onClick={start}>
            <Undo2 size={14} aria-hidden="true" /> Refund payment
          </Button>
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Refund payment">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Sends the money back to the renter through Pesapal. It shows as pending until Pesapal confirms it.
          </p>
          <Input
            label="Amount (KES)"
            type="number"
            min="0"
            max={paid ?? undefined}
            inputMode="decimal"
            hint={paid != null ? `Leave empty to refund all of it (${formatCurrency(Math.round(paid))})` : 'Leave empty to refund all of it'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={problems.amount}
          />
          <Textarea label="Reason" name="reason" rows={3} required value={reason} onChange={(e) => setReason(e.target.value)} error={problems.reason} />
          {request.isError && <p role="alert" className="text-sm text-red-600">{apiErrorMessage(request.error, "Couldn't start the refund.")}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={request.isPending}>Start refund</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
