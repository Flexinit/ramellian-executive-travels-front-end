import React from 'react';
import { Link } from 'react-router-dom';
import { Banknote, CircleDollarSign, Clock, HandCoins, Landmark, Scale, Wallet } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Pagination from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';
import Skeleton from '../components/ui/Skeleton';
import ErrorBanner from '../components/ui/ErrorBanner';
import StatTile from '../components/reports/StatTile';
import { usePlatformProfit, useUnsettledBookings } from '../hooks/useFinancials';
import { apiErrorMessage } from '../lib/apiError';
import { formatCurrency, formatDateRange } from '../lib/utils';

const money = (n) => formatCurrency(Math.round(Number(n) || 0));

/**
 * The platform's money (see hooks/useFinancials.js): everything charged, what the platform kept, what owners are owed and
 * what's been paid out, and — below — every booking whose owner isn't fully paid yet, each opening the booking (where
 * its full breakdown and payout are).
 */
export default function AdminFinancesPage() {
  const profit = usePlatformProfit();
  const unsettled = useUnsettledBookings();
  const p = profit.data || {};
  const rows = Array.isArray(unsettled.data) ? unsettled.data : [];
  const pager = usePagination(rows, 10);

  const tiles = [
    { icon: Banknote, label: 'Charged to renters', value: money(p.totalCharged), detail: `${money(p.totalRentalCharged)} rental · ${money(p.totalOverstayCharged)} overstay` },
    { icon: Landmark, label: 'Commission earned', value: money(p.totalCommissionEarned), detail: `${money(p.totalProcessingCollected)} processing fees collected` },
    { icon: CircleDollarSign, label: 'Net profit', value: money(p.platformNetProfit) },
    { icon: HandCoins, label: 'Owner payouts', value: money(p.totalOwnerPayoutsDisbursed), detail: `paid of ${money(p.totalOwnerPayoutsPromised)} owed` },
    { icon: Wallet, label: 'Payouts pending', value: money(p.totalPendingDisbursements) },
    { icon: Scale, label: 'Still owed to owners', value: money(p.outstandingOwnerDebt), detail: `${Number(p.pendingOverstayPayments) || 0} overstay payments outstanding` },
  ];

  return (
    <PageWrapper className="max-w-6xl">
      <PageTitle title="Finances" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Finances</h1>
          <p className="text-muted text-sm mt-1.5">
            What renters were charged, what the platform kept, and what owners are owed — from {Number(p.totalSuccessfulPayments) || 0} successful payments.
          </p>
        </div>

        {profit.isError ? (
          <ErrorBanner message={apiErrorMessage(profit.error, 'Could not load the platform figures.')} onRetry={profit.refetch} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {tiles.map((t) => <StatTile key={t.label} icon={t.icon} label={t.label} value={t.value} detail={t.detail} loading={profit.isLoading} />)}
          </div>
        )}

        <section aria-labelledby="unsettled-heading" className="flex flex-col gap-3">
          <div>
            <h2 id="unsettled-heading" className="font-heading text-ink text-lg font-semibold inline-flex items-center gap-2">
              <Clock size={18} className="text-accent" aria-hidden="true" /> Not settled with the owner yet
            </h2>
            <p className="text-sm text-muted mt-1">Bookings that were paid for, whose owner hasn&apos;t been paid in full. Open one to pay its owner.</p>
          </div>
          {unsettled.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : unsettled.isError ? (
            <ErrorBanner message={apiErrorMessage(unsettled.error, 'Could not load the unsettled bookings.')} onRetry={unsettled.refetch} />
          ) : rows.length === 0 ? (
            <Card className="p-5 text-sm text-muted">Every paid booking is settled with its owner.</Card>
          ) : (
            <Card className="table-scroll">
              <table className="stack-table w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-muted">
                    <th scope="col" className="px-4 py-3 font-medium">Booking</th>
                    <th scope="col" className="px-4 py-3 font-medium">Owner</th>
                    <th scope="col" className="px-4 py-3 font-medium text-right">Collected</th>
                    <th scope="col" className="px-4 py-3 font-medium text-right">Owner paid</th>
                    <th scope="col" className="px-4 py-3 font-medium text-right">Still owed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {pager.pageItems.map((b) => (
                    <tr key={b.bookingId}>
                      <td className="px-4 py-3" data-label="Booking">
                        <Link to={`/admin/bookings/${b.bookingId}`} className="text-ink font-medium hover:text-accent focus-ring rounded">
                          {b.vehicleTitle || 'Booking'}
                        </Link>
                        <p className="text-xs text-muted">
                          {b.startTime && formatDateRange(b.startTime, b.endTime)}{b.renterEmail && ` · ${b.renterEmail}`}
                          {' · '}
                          <Link to={`/admin/bookings/${b.bookingId}/transaction`} className="text-accent hover:underline focus-ring rounded">Breakdown</Link>
                        </p>
                      </td>
                      <td className="px-4 py-3 text-ink" data-label="Owner">{b.ownerEmail || '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink" data-label="Collected">{money(b.totalCollectedFromRenter)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-ink" data-label="Owner paid">
                        {money(b.totalOwnerPayoutsDisbursed)} <span className="text-muted">of {money(b.totalOwnerPayoutsPromised)}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink" data-label="Still owed">{money(b.totalOwnerPayoutsOutstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
          {rows.length > 0 && <Pagination {...pager.props} noun="bookings" />}
        </section>
      </div>
    </PageWrapper>
  );
}
