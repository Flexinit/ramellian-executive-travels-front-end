import React from 'react';
import { Wallet } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import ErrorBanner from '../ui/ErrorBanner';
import { DetailList, DetailRow } from '../ui/DetailList';
import PayoutActions from './PayoutActions';
import { PAYOUT_LABEL, PAYOUT_VARIANT, useBookingDisbursement } from '../../hooks/useDisbursements';
import { apiErrorMessage } from '../../lib/apiError';
import { formatCurrency, formatDateTime } from '../../lib/utils';

/**
 * A booking's payout to its owner, on the admin's booking page — where a payout can be acted on next to the booking
 * it's for (`GET /admin/disbursements/bookings/{bookingId}`). The backend only creates one once the vehicle's pickup is
 * recorded, so until then the card says so instead of offering anything to press.
 *
 * @param {object} booking — `BookingResponse`
 */
export default function BookingPayoutCard({ booking }) {
  const { data: payout, isLoading, isError, error, refetch } = useBookingDisbursement(booking.id);

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
        <p className="text-sm text-muted">
          No payout yet. It&apos;s created once the vehicle&apos;s <strong className="text-ink font-medium">pickup is recorded</strong> on
          this booking (Handover), and then appears here and under Owner Payouts, ready to pay.
        </p>
      ) : (
        <>
          <DetailList>
            <DetailRow label="Amount" valueClassName="font-semibold tabular-nums">{formatCurrency(payout.amount ?? 0)}</DetailRow>
            <DetailRow label="To">{[payout.ownerName, payout.ownerEmail].filter(Boolean).join(' · ') || '—'}</DetailRow>
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
