import React from 'react';
import { Printer } from 'lucide-react';
import Button from '../ui/Button';
import BookingTable from '../booking/BookingTable';
import BookingFilters from '../booking/BookingFilters';
import BookingStatusTabs from '../booking/BookingStatusTabs';
import { useBookingFilters } from '../../hooks/useBookingFilters';
import { bookingMatchesFilters, countBookingsByStatus } from '../../lib/bookingFilters';

/**
 * Itemized report bookings — the exact same status tabs + filter bar + `BookingTable`/`BookingRow` trio as My
 * Bookings, Fleet Bookings and All Bookings (`useBookingFilters`/`bookingMatchesFilters`/`BookingStatusTabs`/
 * `BookingFilters`), rather than a second, narrower filtering and row format that only existed for reports.
 * Adds only a Print button on top, which is genuinely report-specific (`window.print()` — the status tabs and
 * filter bar carry `print:hidden` so only the table itself prints).
 *
 * @param {object[]} rows — bookings from a report (see lib/reports.js), the same `BookingResponse` shape the
 *   other booking tables already render.
 * @param {boolean} [isLoading]
 * @param {string} basePath — row detail route prefix, e.g. "/admin/bookings" or "/owner/bookings"
 */
export default function ReportTable({ rows = [], isLoading = false, basePath }) {
  const { filters, setFilter, resetKey } = useBookingFilters();
  const filtered = rows.filter((r) => bookingMatchesFilters(r, filters));
  const counts = countBookingsByStatus(rows, filters);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <BookingStatusTabs value={filters.status} onChange={(status) => setFilter('status', status)} counts={counts} />
        <Button size="sm" onClick={() => window.print()}>
          <Printer size={14} aria-hidden="true" />
          Print
        </Button>
      </div>
      <div className="print:hidden">
        <BookingFilters filters={filters} setFilter={setFilter} showStatus={false} />
      </div>
      <BookingTable bookings={filtered} isLoading={isLoading} basePath={basePath} resetKey={resetKey} showReceipt />
    </div>
  );
}
