import React from 'react';
import { Navigate } from 'react-router-dom';
import { CalendarCheck, Clock, FileClock } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import { useMyBookings } from '../hooks/useBookings';
import { useDocuments } from '../hooks/useDocuments';
import { BOOKING_STATUSES, DOCUMENT_STATUSES } from '../lib/constants';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

function StatCard({ icon: Icon, label, value, loading }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-accent" aria-hidden="true" />
      </div>
      <div>
        <p className="text-muted text-xs">{label}</p>
        {loading ? (
          <Skeleton className="w-10 h-6 mt-1" />
        ) : (
          <p className="font-heading text-ink text-2xl font-bold">{value}</p>
        )}
      </div>
    </Card>
  );
}

/** Summary cards: total bookings, upcoming trips, pending documents. */
export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  // A booking still in progress (added to the selection, not yet paid and signed — see cartStore's
  // `completeBooking`) takes priority over browsing the dashboard: send the renter straight back to finish
  // it instead of landing here as if nothing were waiting. Unlike `useReturnToCheckoutAfterAuth` (which only
  // fires once, right at the moment sign-in completes), this catches every visit to /dashboard itself —
  // including one later in the same session, not just immediately after logging in.
  const hasOpenBooking = useCartStore((s) => s.items.length > 0);
  const { data: bookings, isLoading: bookingsLoading } = useMyBookings();
  const { data: documents, isLoading: docsLoading } = useDocuments();

  if (hasOpenBooking) {
    return <Navigate to="/booking/checkout" replace />;
  }

  const totalBookings = bookings?.length ?? 0;
  const upcomingTrips =
    bookings?.filter((b) => b.status === BOOKING_STATUSES.CONFIRMED || b.status === BOOKING_STATUSES.ACTIVE).length ??
    0;
  const pendingDocs = documents?.filter((d) => d.status === DOCUMENT_STATUSES.PENDING).length ?? 0;

  return (
    <>
      <PageWrapper>
        <PageTitle title="Dashboard" />
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">
              Welcome{user?.firstName ? `, ${user.firstName}` : ''}
            </h1>
            <p className="text-muted text-sm mt-1">Here's an overview of your account.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={CalendarCheck} label="Total Bookings" value={totalBookings} loading={bookingsLoading} />
            <StatCard icon={Clock} label="Upcoming Trips" value={upcomingTrips} loading={bookingsLoading} />
            <StatCard icon={FileClock} label="Pending Documents" value={pendingDocs} loading={docsLoading} />
          </div>
        </div>
      </PageWrapper>
    </>
  );
}
