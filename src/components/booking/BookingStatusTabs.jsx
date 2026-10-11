import React from 'react';
import { CheckCircle2, Clock, Car, CheckCheck, Ban, AlertTriangle, XCircle, ListFilter } from 'lucide-react';
import { BOOKING_STATUSES } from '../../lib/constants';
import { bookingStatusLabel } from '../../lib/utils';

/**
 * One tab per booking status, Confirmed first (then the rest of the lifecycle, All last) — replaces the
 * Status dropdown from the full `BookingFilters` bar, which crammed seven fields into one row for what
 * picking a status almost always actually is: one click away, not buried in a select among six other
 * filters. Shared by every bookings page — My Bookings, Fleet Bookings, and All Bookings — so status
 * filtering looks and behaves identically for a renter, an owner, and an admin.
 *
 * @param {string} value — a `BOOKING_STATUSES` value, or '' for All
 * @param {(value: string) => void} onChange
 * @param {Record<string, number>} [counts] — from `lib/bookingFilters.js`'s `countBookingsByStatus`; shows
 *   "Confirmed (3)" etc. next to each tab when given, or no count at all when omitted
 */
const TAB_VALUES = [
  BOOKING_STATUSES.CONFIRMED,
  BOOKING_STATUSES.PENDING,
  BOOKING_STATUSES.ACTIVE,
  BOOKING_STATUSES.COMPLETED,
  BOOKING_STATUSES.CANCELLED,
  BOOKING_STATUSES.REJECTED,
  BOOKING_STATUSES.EXPIRED,
  '',
];

/** Same per-status icon as `BookingStatusBadge`, so a status reads the same way everywhere it appears. */
const ICONS = {
  PENDING:   Clock,
  CONFIRMED: CheckCircle2,
  ACTIVE:    Car,
  COMPLETED: CheckCheck,
  CANCELLED: Ban,
  EXPIRED:   AlertTriangle,
  REJECTED:  XCircle,
};

export default function BookingStatusTabs({ value, onChange, counts }) {
  return (
    <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-2 border-b border-white/10 pb-px">
      {TAB_VALUES.map((tab) => {
        const active = value === tab;
        const Icon = tab ? ICONS[tab] : ListFilter;
        const count = counts ? counts[tab || 'ALL'] ?? 0 : null;
        return (
          <button
            key={tab || 'ALL'}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors focus-ring ${
              active
                ? 'text-brand-gold border-brand-gold'
                : 'text-brand-grey border-transparent hover:text-brand-white hover:border-white/20'
            }`}
          >
            <Icon size={14} aria-hidden="true" />
            {tab ? bookingStatusLabel(tab) : 'All'}
            {count !== null && (
              <span className={`text-xs font-normal ${active ? 'text-brand-gold/70' : 'text-brand-grey/70'}`}>({count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
