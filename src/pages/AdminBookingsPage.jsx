import React from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import BookingTable from '../components/booking/BookingTable';
import BookingFilters from '../components/booking/BookingFilters';
import BookingStatusTabs from '../components/booking/BookingStatusTabs';
import { useAllBookings } from '../hooks/useBookings';
import { useBookingFilters } from '../hooks/useBookingFilters';
import { bookingMatchesFilters, countBookingsByStatus } from '../lib/bookingFilters';

export default function AdminBookingsPage() {
  const { filters, setFilter, resetKey } = useBookingFilters();
  const { data: bookings, isLoading } = useAllBookings();
  const filtered = bookings?.filter((b) => bookingMatchesFilters(b, filters));
  const counts = countBookingsByStatus(bookings, filters);

  return (
    <PageWrapper>
      <PageTitle title="All Bookings" />
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">All Bookings</h1>
        <BookingStatusTabs value={filters.status} onChange={(status) => setFilter('status', status)} counts={counts} />
        <BookingFilters filters={filters} setFilter={setFilter} showStatus={false} />
        <BookingTable bookings={filtered} isLoading={isLoading} basePath="/admin/bookings" resetKey={resetKey} showReceipt />
      </div>
    </PageWrapper>
  );
}
