import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Pagination from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import SegmentedControl from '../components/ui/SegmentedControl';
import RefundActions from '../components/admin/RefundActions';
import { REFUND_LABEL, REFUND_VARIANT, useRefunds } from '../hooks/useRefunds';
import { apiErrorMessage } from '../lib/apiError';
import { formatCurrency, formatDateTime } from '../lib/utils';

const STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];

/**
 * Refunds (see hooks/useRefunds.js): money sent back to renters through Pesapal, by status. A refund is started from
 * the booking's own page (All Bookings → the booking → **Refund payment**); an open one can be settled by hand here.
 */
export default function AdminRefundsPage() {
  const [status, setStatus] = useState('PENDING');
  const { data, isLoading, isError, error, refetch } = useRefunds(status);
  const list = Array.isArray(data) ? data : [];
  const pager = usePagination(list, 10, status);

  return (
    <PageWrapper className="max-w-6xl">
      <PageTitle title="Refunds" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Refunds</h1>
          <p className="text-muted text-sm mt-1.5">
            Money sent back to renters through Pesapal. Start a refund from the booking&apos;s own page under All Bookings.
            If Pesapal doesn&apos;t report back, mark it refunded or failed here.
          </p>
        </div>

        <SegmentedControl
          label="Refund status"
          options={STATUSES.map((s) => ({ value: s, label: REFUND_LABEL[s] }))}
          value={status}
          onChange={setStatus}
          className="self-start"
        />

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" label="Loading refunds" /></div>
        ) : isError ? (
          <ErrorBanner message={apiErrorMessage(error, 'Could not load the refunds.')} onRetry={refetch} />
        ) : list.length === 0 ? (
          <EmptyState
            title={`No ${REFUND_LABEL[status].toLowerCase()} refunds`}
            description="Refunds appear here once they're started from a booking."
            action={{ label: 'All Bookings', to: '/admin/bookings' }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {pager.pageItems.map((r) => (
              <Card key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-ink font-semibold">{r.vehicleTitle || 'Vehicle'}</span>
                    <Badge label={REFUND_LABEL[r.status] || r.status} variant={REFUND_VARIANT[r.status] || 'neutral'} />
                  </div>
                  {r.reason && <p className="text-sm text-muted">{r.reason}</p>}
                  <p className="text-xs text-muted">
                    {r.bookingId && <Link to={`/admin/bookings/${r.bookingId}`} className="text-accent hover:underline focus-ring rounded">Booking</Link>}
                    {r.createdAt && ` · started ${formatDateTime(r.createdAt)}`}
                    {r.initiatedBy && ` by ${r.initiatedBy}`}
                    {r.pesapalRefundTrackingId && ` · Pesapal ref ${r.pesapalRefundTrackingId}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <span className="text-lg font-bold text-ink tabular-nums">{formatCurrency(Math.round(Number(r.amount) || 0))}</span>
                  <RefundActions refund={r} />
                </div>
              </Card>
            ))}
            <Pagination {...pager.props} noun="refunds" />
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
