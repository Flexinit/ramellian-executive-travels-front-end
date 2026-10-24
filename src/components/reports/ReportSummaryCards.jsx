import React from 'react';
import { Wallet, CalendarCheck, Landmark } from 'lucide-react';
import StatTile from './StatTile';
import { formatCurrency } from '../../lib/utils';
import { reportCounts } from '../../lib/reports';

/**
 * The headline numbers of a `BookingReportResponse`, and how many bookings ended up in each outcome.
 *
 * @param {object} report
 * @param {boolean} isLoading
 * @param {'admin'|'owner'|'mine'} kind — admin also shows the platform's own revenue, an owner their payout
 */
export default function ReportSummaryCards({ report, isLoading, kind = 'owner' }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile icon={CalendarCheck} label="Total Bookings" value={report?.totalBookings ?? 0} loading={isLoading} />
        <StatTile icon={Wallet} label="Paid Bookings, Gross" value={formatCurrency(report?.successfulGrossAmount)} loading={isLoading} />
        {kind === 'admin' && (
          <StatTile icon={Landmark} label="Platform Revenue" value={formatCurrency(report?.platformRevenue)} loading={isLoading} />
        )}
        {kind === 'owner' && (
          <StatTile icon={Landmark} label="Your Payout" value={formatCurrency(report?.ownerPayout)} loading={isLoading} />
        )}
      </div>

      <ul aria-label="Bookings by outcome" className="flex flex-wrap gap-2">
        {reportCounts(report).map((count) => (
          <li key={count.key} className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-xs text-muted">
            {count.label} <span className="text-ink font-semibold ml-1">{isLoading ? '…' : count.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
