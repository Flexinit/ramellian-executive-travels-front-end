import React from 'react';
import { CheckCircle2, Clock, Car, CheckCheck, Ban, AlertTriangle, XCircle } from 'lucide-react';
import Badge from '../ui/Badge';
import { bookingStatusLabel, bookingStatusVariant } from '../../lib/utils';

/** One meaningful icon per status, not colour alone as the only signal — a renter scanning a list of
 * badges shouldn't have to rely on distinguishing green from green. */
const ICONS = {
  PENDING:   Clock,
  CONFIRMED: CheckCircle2,
  ACTIVE:    Car,
  COMPLETED: CheckCheck,
  CANCELLED: Ban,
  EXPIRED:   AlertTriangle,
  REJECTED:  XCircle,
};

/**
 * A booking's status, shown the same way everywhere it appears: uppercase, colour-coded
 * (`bookingStatusVariant` — green for Confirmed/Active/Completed, amber for Pending, red for
 * Cancelled/Expired/Rejected), each with its own icon. Replaces every place that used to build this by
 * hand with `<Badge label={bookingStatusLabel(status)} variant={bookingStatusVariant(status)} />`.
 * @param {string} status
 * @param {string} [className]
 */
export default function BookingStatusBadge({ status, className = '' }) {
  const Icon = ICONS[status] || Clock;
  return (
    <Badge
      label={
        <span className="inline-flex items-center gap-1">
          <Icon size={12} aria-hidden="true" />
          {bookingStatusLabel(status)}
        </span>
      }
      variant={bookingStatusVariant(status)}
      className={`uppercase tracking-wide ${className}`}
    />
  );
}
