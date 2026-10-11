import React from 'react';
import { CalendarCheck, Wallet, FileClock, Users, Landmark } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import StatTile from '../components/reports/StatTile';
import { useReports } from '../hooks/useReports';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { usePendingDocuments } from '../hooks/useAdminDocuments';
import { formatCurrency } from '../lib/utils';

/**
 * The administrator's overview, from the real endpoints: the admin booking report
 * (`/bookings/reports/admin`), the account list (`/users/admin`) and the documents waiting for
 * review (`/documents/admin/pending`). Each number opens the page behind it.
 */
export default function AdminDashboardPage() {
  const { data: report, isLoading: loadingReport } = useReports('admin');
  const { data: users, isLoading: loadingUsers } = useAdminUsers();
  const { data: pending, isLoading: loadingPending } = usePendingDocuments();

  return (
    <PageWrapper>
      <PageTitle title="Admin Dashboard" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">Admin Overview</h1>
          <p className="text-brand-grey text-sm mt-1">Platform-wide activity at a glance.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatTile icon={Users} label="Users" value={Array.isArray(users) ? users.length : '—'} loading={loadingUsers} to="/admin/users" />
          <StatTile
            icon={FileClock}
            label="Documents to review"
            value={Array.isArray(pending) ? pending.length : '—'}
            loading={loadingPending}
            to="/admin/documents"
          />
          <StatTile icon={CalendarCheck} label="All Bookings" value={report?.totalBookings ?? 0} loading={loadingReport} to="/admin/bookings" />
          <StatTile icon={Wallet} label="Paid Bookings, Gross" value={formatCurrency(report?.successfulGrossAmount)} loading={loadingReport} to="/admin/reports" />
          <StatTile icon={Landmark} label="Platform Revenue" value={formatCurrency(report?.platformRevenue)} loading={loadingReport} to="/admin/reports" />
        </div>
      </div>
    </PageWrapper>
  );
}
