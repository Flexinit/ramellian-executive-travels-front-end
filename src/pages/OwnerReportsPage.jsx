import React, { useMemo, useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import SegmentedControl from '../components/ui/SegmentedControl';
import ReportSummaryCards from '../components/reports/ReportSummaryCards';
import ReportTable from '../components/reports/ReportTable';
import BookingsChart from '../components/reports/BookingsChart';
import BookingFilters from '../components/booking/BookingFilters';
import BookingStatusTabs from '../components/booking/BookingStatusTabs';
import { useReports } from '../hooks/useReports';
import { reportBookings, filterReport } from '../lib/reports';
import { useBookingFilters } from '../hooks/useBookingFilters';
import { countBookingsByStatus } from '../lib/bookingFilters';

const TABS = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'bookings', label: 'Bookings' },
];

/**
 * The fleet report: revenue (payout, totals by outcome, the trend) and the bookings themselves, as two tabs
 * rather than stacked — same split, and the same reasoning, as `AdminReportsPage`'s own Revenue/Bookings tabs.
 *
 * Both tabs share one filter bar's worth of state (status/period/trip type/mode/date range/vehicle) via
 * `useBookingFilters`, which is backed by the URL rather than component state — so this page's own call here
 * and `ReportTable`'s own internal one (shown only once the Bookings tab is open) read and write the exact
 * same values without anything needing to be passed between them. The filter controls themselves are only
 * rendered once, above the Revenue tab's content; `ReportTable` already renders its own copy for Bookings, so
 * showing this page's copy there too would just be the same controls twice.
 */
export default function OwnerReportsPage() {
  const [tab, setTab] = useState('revenue');
  const { data: report, isLoading } = useReports('owner');
  const { filters, setFilter } = useBookingFilters();
  const filteredReport = useMemo(() => filterReport(report, filters), [report, filters]);
  const counts = useMemo(() => countBookingsByStatus(reportBookings(report), filters), [report, filters]);

  return (
    <PageWrapper>
      <PageTitle title="Owner Reports" />
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Fleet Reports</h1>
        <SegmentedControl kind="tab" label="Report section" value={tab} onChange={setTab} options={TABS} />

        {tab === 'revenue' && (
          <div className="flex flex-col gap-4">
            <BookingStatusTabs value={filters.status} onChange={(status) => setFilter('status', status)} counts={counts} />
            <BookingFilters filters={filters} setFilter={setFilter} showStatus={false} />
            <ReportSummaryCards report={filteredReport} isLoading={isLoading} kind="owner" />
            {!isLoading && <BookingsChart report={filteredReport} />}
          </div>
        )}
        {tab === 'bookings' && <ReportTable rows={reportBookings(report)} isLoading={isLoading} basePath="/owner/bookings" />}
      </div>
    </PageWrapper>
  );
}
