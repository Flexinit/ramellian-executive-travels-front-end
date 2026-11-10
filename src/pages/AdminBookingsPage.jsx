import React from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import BookingTable from '../components/booking/BookingTable';
import BookingFilters from '../components/booking/BookingFilters';
import BookingStatusTabs from '../components/booking/BookingStatusTabs';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useAllBookings } from '../hooks/useBookings';
import { useBookingFilters } from '../hooks/useBookingFilters';
import { bookingMatchesFilters, countBookingsByStatus } from '../lib/bookingFilters';

export default function AdminBookingsPage() {
  const { filters, setFilter, resetKey } = useBookingFilters();
  const { data: bookings, isLoading, isError, refetch, report } = useAllBookings();
  const filtered = bookings?.filter((b) => bookingMatchesFilters(b, filters));
  const counts = countBookingsByStatus(bookings, filters);
  // The admin report (the only list of every booking) only lists its five outcome groups, while `totalBookings` counts
  // them all: say so rather than let the rest go missing without a word (docs/backend-requests.md item 66).
  const unlisted = Math.max(0, (Number(report?.totalBookings) || 0) - (bookings?.length || 0));

  return (
    <PageWrapper>
      <PageTitle title="All Bookings" />
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">All Bookings</h1>
        {isError && !bookings ? (
          <ErrorBanner message="Could not load the bookings." onRetry={refetch} />
        ) : (
          <>
            <BookingStatusTabs value={filters.status} onChange={(status) => setFilter('status', status)} counts={counts} />
            <BookingFilters filters={filters} setFilter={setFilter} showStatus={false} />
            {unlisted > 0 && (
              <p role="note" className="rounded-tile bg-amber-500/10 px-4 py-3 text-sm text-ink">
                Showing {bookings.length} of {report.totalBookings} bookings. The other {unlisted} aren&apos;t upcoming, active,
                completed, cancelled or rejected, and the system doesn&apos;t list those here yet.
              </p>
            )}
            <BookingTable bookings={filtered} isLoading={isLoading} basePath="/admin/bookings" resetKey={resetKey} showReceipt />
          </>
        )}
      </div>
    </PageWrapper>
  );
}
