import React, { useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import SegmentedControl from '../components/ui/SegmentedControl';
import { SignedInSection, PeopleSection, VehiclesSection } from '../components/reports/PlatformOverview';
import ReportSummaryCards from '../components/reports/ReportSummaryCards';
import ReportTable from '../components/reports/ReportTable';
import BookingsChart from '../components/reports/BookingsChart';
import { useReports } from '../hooks/useReports';
import { reportBookings } from '../lib/reports';

const TABS = [
  { value: 'activity', label: 'Activity' },
  { value: 'people', label: 'People' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'bookings', label: 'Bookings' },
];

/**
 * The platform report: who has signed in recently, the people and vehicles on the platform, revenue, and the
 * bookings themselves — one tab at a time rather than all of it stacked in a single, very long scroll, since
 * each is really its own independent question ("who's online right now" vs. "how's revenue trending" vs.
 * "show me every booking") rather than a sequence to read top to bottom. Revenue and Bookings are two separate
 * tabs, not one combined "Bookings & Revenue" — a quick look at the trend and totals is a different task from
 * digging through the itemized list, and the itemized `BookingTable` (same widget as My/Fleet/All Bookings,
 * via `ReportTable`) is tall enough on its own to deserve its own tab rather than sitting below a chart. Each
 * tab's own data only loads once that tab is actually opened (and stays cached after, via TanStack Query), so
 * switching between them doesn't force every section to fetch upfront just because the page itself was opened.
 */
export default function AdminReportsPage() {
  const [tab, setTab] = useState('activity');
  const { data: report, isLoading } = useReports('admin');

  return (
    <PageWrapper>
      <PageTitle title="Platform Reports" />
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">Platform Reports</h1>
        <SegmentedControl kind="tab" label="Report section" value={tab} onChange={setTab} options={TABS} />

        {tab === 'activity' && <SignedInSection />}
        {tab === 'people' && <PeopleSection />}
        {tab === 'vehicles' && <VehiclesSection />}
        {tab === 'revenue' && (
          <section aria-labelledby="revenue-heading" className="flex flex-col gap-4">
            <h2 id="revenue-heading" className="font-heading text-brand-white text-lg font-semibold">
              Bookings and revenue
            </h2>
            <ReportSummaryCards report={report} isLoading={isLoading} kind="admin" />
            {!isLoading && <BookingsChart report={report} />}
          </section>
        )}
        {tab === 'bookings' && (
          <section aria-labelledby="bookings-heading" className="flex flex-col gap-4">
            <h2 id="bookings-heading" className="font-heading text-brand-white text-lg font-semibold">
              Bookings
            </h2>
            <ReportTable rows={reportBookings(report)} isLoading={isLoading} basePath="/admin/bookings" />
          </section>
        )}
      </div>
    </PageWrapper>
  );
}
