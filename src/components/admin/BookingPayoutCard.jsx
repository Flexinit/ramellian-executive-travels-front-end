import React, { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import ErrorBanner from '../ui/ErrorBanner';
import { DetailList, DetailRow } from '../ui/DetailList';
import PayoutActions from './PayoutActions';
import PayoutFormModal from './PayoutFormModal';
import Button from '../ui/Button';
import { PAYOUT_LABEL, PAYOUT_VARIANT, useBookingDisbursement, useCreateDisbursement } from '../../hooks/useDisbursements';
import { apiErrorMessage } from '../../lib/apiError';
import { formatCurrency, formatDateTime } from '../../lib/utils';

/**
 * A booking's payout to its owner, on the admin's booking page — where a payout can be acted on next to the booking
 * it's for (`GET /admin/disbursements/bookings/{bookingId}`). The backend only creates one once the vehicle's pickup is
 * recorded; if that never happened (or the booking is older than payouts), **Create payout** makes one by hand
 * (`POST /admin/disbursements/bookings/{bookingId}`, live spec 2026-10-26), its amount filled in with the owner's
 * share of the booking (`BookingResponse.ownerPayout`).
 *
 * @param {object} booking — `BookingResponse`
 */
export default function BookingPayoutCard({ booking }) {
  const { data: payout, isLoading, isError, error, refetch } = useBookingDisbursement(booking.id);
  const create = useCreateDisbursement();
  const [creating, setCreating] = useState(false);
  // Only a booking that was actually paid for has anything to pay out.
  const paid = ['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(booking.status);

  return (
    <Card className="p-5 flex flex-col gap-4" aria-label="Owner payout">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-heading text-ink text-base font-semibold inline-flex items-center gap-2">
          <Wallet size={16} className="text-accent" aria-hidden="true" />
          Owner payout
        </h2>
        {payout && <Badge label={PAYOUT_LABEL[payout.status] || payout.status} variant={PAYOUT_VARIANT[payout.status] || 'neutral'} />}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner label="Loading the payout" /></div>
      ) : isError ? (
        <ErrorBanner message={apiErrorMessage(error, 'Could not load the payout.')} onRetry={refetch} />
      ) : !payout ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            No payout yet. It&apos;s normally created when the vehicle&apos;s <strong className="text-ink font-medium">pickup is recorded</strong> on
            this booking (Handover).{paid ? ' If that didn’t happen, create it here.' : ''}
          </p>
          {paid && (
            <Button size="sm" className="self-start" onClick={() => setCreating(true)}>
              <Plus size={14} aria-hidden="true" /> Create payout
            </Button>
          )}
          <PayoutFormModal
            isOpen={creating}
            onClose={() => setCreating(false)}
            title="Create payout"
            submitLabel="Create payout"
            initial={{ amount: booking.ownerPayout }}
            mutation={create}
            intro="For when the automatic payout didn't happen. It's created as To pay — then send it, or record it as paid by hand."
            onSubmit={(fields) => create.mutate({ bookingId: booking.id, ...fields }, { onSuccess: () => setCreating(false) })}
          />
        </div>
      ) : (
        <>
          <DetailList>
            <DetailRow label="Amount" valueClassName="font-semibold tabular-nums">{formatCurrency(payout.amount ?? 0)}</DetailRow>
            <DetailRow label="To">{[payout.ownerName, payout.ownerEmail].filter(Boolean).join(' · ') || '—'}</DetailRow>
            <DetailRow label="Phone (M-Pesa)" hidden={!payout.ownerPhone}>{payout.ownerPhone}</DetailRow>
            <DetailRow label="Reference" hidden={!payout.reference}>{payout.reference}</DetailRow>
            <DetailRow label={payout.status === 'FAILED' ? 'Failed' : payout.status === 'PROCESSING' ? 'Sent' : 'Paid'} hidden={!payout.triggeredAt}>
              {payout.triggeredAt && formatDateTime(payout.triggeredAt)}{payout.triggeredBy ? ` by ${payout.triggeredBy}` : ''}
            </DetailRow>
            <DetailRow label="Notes" stacked hidden={!payout.notes}>{payout.notes}</DetailRow>
          </DetailList>
          <div className="flex flex-wrap gap-2">
            <PayoutActions payout={payout} />
          </div>
        </>
      )}
    </Card>
  );
}
