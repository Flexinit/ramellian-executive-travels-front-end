import React, { useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import BookingTable from '../components/booking/BookingTable';
import BookingFilters from '../components/booking/BookingFilters';
import BookingStatusTabs from '../components/booking/BookingStatusTabs';
import ChauffeurAssignModal from '../components/booking/ChauffeurAssignModal';
import { useOwnerBookings } from '../hooks/useBookings';
import { useBookingFilters } from '../hooks/useBookingFilters';
import { bookingMatchesFilters, countBookingsByStatus } from '../lib/bookingFilters';

export default function OwnerBookingsPage() {
  const { filters, setFilter, resetKey } = useBookingFilters();
  const { data: bookings, isLoading } = useOwnerBookings();
  const filtered = bookings?.filter((b) => bookingMatchesFilters(b, filters));
  const counts = countBookingsByStatus(bookings, filters);
  const [assigning, setAssigning] = useState(null);

  return (
    <PageWrapper>
      <PageTitle title="Fleet Bookings" />
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">Fleet Bookings</h1>
        <BookingStatusTabs value={filters.status} onChange={(status) => setFilter('status', status)} counts={counts} />
        <BookingFilters filters={filters} setFilter={setFilter} showStatus={false} />
        <BookingTable
          bookings={filtered}
          isLoading={isLoading}
          basePath="/owner/bookings"
          actionLabel="Assign"
          onAction={(booking) => setAssigning(booking)}
          resetKey={resetKey}
          showReceipt
        />
      </div>

      <ChauffeurAssignModal
        isOpen={!!assigning}
        onClose={() => setAssigning(null)}
        bookingId={assigning?.id}
        currentChauffeur={assigning?.chauffeurName}
      />
    </PageWrapper>
  );
}
