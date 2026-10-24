import React from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import BookingTable from '../components/booking/BookingTable';
import BookingStatusTabs from '../components/booking/BookingStatusTabs';
import { useMyBookings } from '../hooks/useBookings';
import { useBookingFilters } from '../hooks/useBookingFilters';
import { bookingMatchesFilters, countBookingsByStatus } from '../lib/bookingFilters';

/** Defaults to the Confirmed tab on arrival — see `useBookingFilters`, shared by every bookings page. */
export default function MyBookingsPage() {
  const { filters, setFilter, resetKey } = useBookingFilters();
  const { data: bookings, isLoading } = useMyBookings();

  const filtered = bookings
    ?.filter((b) => bookingMatchesFilters(b, filters))
    // Latest trip first — the backend returns these in no particular guaranteed order.
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  const counts = countBookingsByStatus(bookings, filters);

  return (
    <>
      <PageWrapper>
        <PageTitle title="My Bookings" />
        <div className="flex flex-col gap-6">
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">My Bookings</h1>
          <BookingStatusTabs value={filters.status} onChange={(status) => setFilter('status', status)} counts={counts} />
          <BookingTable bookings={filtered} isLoading={isLoading} resetKey={resetKey} showContract showReceipt />
        </div>
      </PageWrapper>
    </>
  );
}
