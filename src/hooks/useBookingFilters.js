import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EMPTY_BOOKING_FILTERS } from '../lib/bookingFilters';
import { BOOKING_STATUSES } from '../lib/constants';

const KEYS = Object.keys(EMPTY_BOOKING_FILTERS);

/**
 * Reads/writes a bookings table's filters (status, when, trip type, mode, date range, vehicle search) from
 * the URL, the same way `AdminBookingsPage`'s status filter always has — so a filtered view is bookmarkable
 * and survives a refresh, and `BookingTable`'s own pagination can reset to page 1 via `resetKey` whenever any
 * of them changes. One hook shared by every bookings page (My Bookings, Fleet Bookings, All Bookings, and the
 * reports pages' own Bookings tab) rather than each one wiring the same `URLSearchParams` dance by hand.
 *
 * Defaults the status to Confirmed once, only when nothing's already set (e.g. a bookmarked/shared link with
 * its own status, or a status already chosen earlier in this visit) — that's the tab almost everyone actually
 * wants on arrival, not an unfiltered list of every booking ever made. Centralized here, rather than copied
 * into each page, so every bookings table opens the same way without relying on each one remembering to do it.
 * @returns {{ filters: typeof EMPTY_BOOKING_FILTERS, setFilter: (key: string, value: string) => void, resetKey: string }}
 */
export function useBookingFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = Object.fromEntries(KEYS.map((key) => [key, searchParams.get(key) || '']));

  function setFilter(key, value) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );
  }

  useEffect(() => {
    if (!searchParams.get('status')) setFilter('status', BOOKING_STATUSES.CONFIRMED);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { filters, setFilter, resetKey: KEYS.map((key) => filters[key]).join(':') };
}
