import React from 'react';
import Select from '../ui/Select';
import Input from '../ui/Input';
import { BOOKING_STATUSES, BOOKING_PERIODS, BOOKING_PERIOD_LABELS, TRIP_TYPE_LABELS, BOOKING_MODES } from '../../lib/constants';

const STATUS_OPTIONS = Object.values(BOOKING_STATUSES).map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }));
const PERIOD_OPTIONS = Object.values(BOOKING_PERIODS).map((value) => ({ value, label: BOOKING_PERIOD_LABELS[value] }));
const TRIP_TYPE_OPTIONS = Object.entries(TRIP_TYPE_LABELS).map(([value, label]) => ({ value, label }));
const MODE_OPTIONS = [
  { value: BOOKING_MODES.SELF_DRIVE, label: 'Self-Drive' },
  { value: BOOKING_MODES.CHAUFFEURED, label: 'Chauffeured' },
];

/**
 * The filter bar for a bookings table — when (Upcoming/Ongoing/Past), trip type, booking mode, a
 * pickup-date range, and a vehicle name search, plus status itself — one shared widget rather than three
 * pages each hand-rolling their own subset (`useBookingFilters` is its usual pairing: `filters`/`setFilter`
 * straight from there). `showStatus` hides the Status select: every bookings page (My Bookings, Fleet
 * Bookings, All Bookings) now picks status from the same `BookingStatusTabs` strip above this bar instead,
 * so the status control looks and behaves identically no matter which role is looking at it.
 * @param {typeof import('../../lib/bookingFilters').EMPTY_BOOKING_FILTERS} filters
 * @param {(key: string, value: string) => void} setFilter
 * @param {boolean} [showStatus]
 */
export default function BookingFilters({ filters, setFilter, showStatus = true }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {showStatus && (
        <Select
          label="Status"
          name="status"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          placeholder="All statuses"
          className="w-full sm:w-40"
        />
      )}
      <Select
        label="When"
        name="period"
        options={PERIOD_OPTIONS}
        value={filters.period}
        onChange={(e) => setFilter('period', e.target.value)}
        placeholder="All time"
        className="w-full sm:w-36"
      />
      <Select
        label="Trip Type"
        name="tripType"
        options={TRIP_TYPE_OPTIONS}
        value={filters.tripType}
        onChange={(e) => setFilter('tripType', e.target.value)}
        placeholder="Any trip type"
        className="w-full sm:w-40"
      />
      <Select
        label="Mode"
        name="mode"
        options={MODE_OPTIONS}
        value={filters.mode}
        onChange={(e) => setFilter('mode', e.target.value)}
        placeholder="Any mode"
        className="w-full sm:w-36"
      />
      <Input
        label="From"
        name="from"
        type="date"
        value={filters.from}
        onChange={(e) => setFilter('from', e.target.value)}
        className="w-full sm:w-36"
      />
      <Input
        label="To"
        name="to"
        type="date"
        value={filters.to}
        onChange={(e) => setFilter('to', e.target.value)}
        className="w-full sm:w-36"
      />
      <Input
        label="Vehicle"
        name="vehicle"
        type="search"
        placeholder="Search by vehicle"
        value={filters.vehicle}
        onChange={(e) => setFilter('vehicle', e.target.value)}
        className="w-full sm:w-44"
      />
    </div>
  );
}
