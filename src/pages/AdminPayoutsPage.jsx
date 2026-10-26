import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import SegmentedControl from '../components/ui/SegmentedControl';
import PayoutActions from '../components/admin/PayoutActions';
import { PAYOUT_LABEL, PAYOUT_VARIANT, useDisbursements } from '../hooks/useDisbursements';
import { apiErrorMessage } from '../lib/apiError';
import { formatCurrency, formatDateTime } from '../lib/utils';

/**
 * Owner payouts (see hooks/useDisbursements.js): each booking's payout to its owner, by status. A payout is created
 * by the backend when the vehicle's pickup is recorded — not when the booking is paid — so a paid booking whose
 * pickup hasn't been recorded has nothing here yet; the empty state says so, and each booking's own page shows its
 * payout (or why there isn't one). Since 2026-10-26 a payout can also be **PROCESSING** (sent, not yet confirmed by
 * the payment provider), with **Check status** to ask for the latest.
 */
const STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];

export default function AdminPayoutsPage() {
  const [status, setStatus] = useState('PENDING');
  const { data, isLoading, isError, error, refetch } = useDisbursements(status);
  const list = Array.isArray(data) ? data : [];

  return (
    <PageWrapper className="max-w-6xl">
      <PageTitle title="Owner Payouts" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Owner Payouts</h1>
          <p className="text-muted text-sm mt-1.5">
            What each owner is owed for a booking. Mark it paid once the money is sent, with its reference. A payout
            that's <strong className="text-ink font-medium">Processing</strong> has been sent and is waiting for the payment
            provider — <strong className="text-ink font-medium">Check status</strong> asks for the latest.
          </p>
        </div>

        <SegmentedControl
          label="Payout status"
          options={STATUSES.map((s) => ({ value: s, label: PAYOUT_LABEL[s] }))}
          value={status}
          onChange={setStatus}
          className="self-start"
        />

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" label="Loading payouts" /></div>
        ) : isError ? (
          <ErrorBanner message={apiErrorMessage(error, 'Could not load the payouts.')} onRetry={refetch} />
        ) : list.length === 0 ? (
          <EmptyState
            title={`No payouts ${PAYOUT_LABEL[status].toLowerCase()}`}
            description={
              status === 'PENDING'
                ? "A booking's payout appears here once the vehicle's pickup has been recorded on the booking (Handover) — not as soon as it's paid. Open a booking under All Bookings to see where its payout stands — or to create one there if the automatic one never happened."
                : 'Payouts appear here once they reach this stage.'
            }
            action={status === 'PENDING' ? { label: 'All Bookings', to: '/admin/bookings' } : undefined}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((d) => (
              <Card key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-ink font-semibold">{d.vehicleTitle || 'Vehicle'}</span>
                    <Badge label={PAYOUT_LABEL[d.status] || d.status} variant={PAYOUT_VARIANT[d.status] || 'neutral'} />
                  </div>
                  <p className="text-sm text-muted">
                    To {d.ownerName || d.ownerEmail}{d.ownerName && d.ownerEmail ? ` (${d.ownerEmail})` : ''}{d.ownerPhone ? ` · ${d.ownerPhone}` : ''}
                  </p>
                  <p className="text-xs text-muted">
                    {d.bookingId && <Link to={`/admin/bookings/${d.bookingId}`} className="text-accent hover:underline focus-ring rounded">Booking</Link>}
                    {d.createdAt && ` · created ${formatDateTime(d.createdAt)}`}
                    {d.triggeredAt && ` · ${d.status === 'FAILED' ? 'failed' : d.status === 'PROCESSING' ? 'sent' : 'paid'} ${formatDateTime(d.triggeredAt)}${d.triggeredBy ? ` by ${d.triggeredBy}` : ''}`}
                    {d.reference && ` · ref ${d.reference}`}
                  </p>
                  {d.notes && <p className="text-xs text-muted italic">{d.notes}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <span className="text-lg font-bold text-ink tabular-nums">{formatCurrency(d.amount ?? 0)}</span>
                  <PayoutActions payout={d} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
