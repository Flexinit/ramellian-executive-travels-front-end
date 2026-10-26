import React from 'react';
import { useLocation } from 'react-router-dom';
import { addDays, isBefore, parseISO, startOfDay } from 'date-fns';
import { KeyRound } from 'lucide-react';
import Button from '../ui/Button';
import { useMyBookings } from '../../hooks/useBookings';
import { useVehicle } from '../../hooks/useVehicles';
import { useAuthStore } from '../../store/authStore';
import { BOOKING_STATUSES } from '../../lib/constants';
import { canRecordPickup, formatTime } from '../../lib/utils';

/**
 * The renter's pickup, pinned to the top of every signed-in page (product owner, 2026-10-26: the renter must know to
 * go and collect the car and to record the pickup). Recording it is the renter's job — the backend refuses anyone
 * else — and it matters: it starts the trip and is what creates the owner's payout (no payout exists until the
 * pickup is on record; see hooks/useDisbursements.js). So:
 *
 *  - the day before a confirmed booking starts: a heads-up that the pickup is tomorrow;
 *  - from its start day on: "pick up the car, then record the pickup", with **Record pickup** opening the form
 *    straight away (`/dashboard/bookings/{id}?record=pickup`).
 *
 * It stays until the pickup is recorded (the booking leaves Confirmed), and isn't shown on that booking's own page,
 * which has the same button in place. Several due at once: the earliest.
 */
export default function PickupReminder() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { pathname } = useLocation();
  const { data } = useMyBookings({ enabled: isAuthenticated });
  const list = Array.isArray(data) ? data : data?.content || [];

  const now = new Date();
  const tomorrowEnd = addDays(startOfDay(now), 2);
  const due = list
    .filter((b) => b?.status === BOOKING_STATUSES.CONFIRMED && b.startTime && isBefore(parseISO(b.startTime), tomorrowEnd))
    .sort((a, b) => parseISO(a.startTime) - parseISO(b.startTime))[0];

  const { data: vehicle } = useVehicle(due?.vehicleId);
  if (!due || pathname === `/dashboard/bookings/${due.id}`) return null;

  const ready = canRecordPickup(due, now);
  const car = vehicle?.model ? `the ${vehicle.model}` : 'your vehicle';
  const where = due.pickupLocation ? ` at ${due.pickupLocation}` : '';

  return (
    <div className="sticky top-20 z-20 px-4 pt-3 sm:px-6 lg:px-8">
      <div
        role="status"
        aria-label="Your pickup"
        className="mx-auto max-w-5xl flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl bg-brand-navy px-4 py-3 text-white shadow-lift"
      >
        <span className="flex items-start gap-3 min-w-0 flex-1">
          <KeyRound size={20} className="shrink-0 mt-0.5 text-brand-gold" aria-hidden="true" />
          <span className="text-sm">
            {ready ? (
              <>
                <strong className="font-semibold">Time to pick up {car}{where}.</strong> When you collect it, record the
                pickup — the reading, fuel and a photo — so your trip starts.
              </>
            ) : (
              <>
                <strong className="font-semibold">You pick up {car} tomorrow, {formatTime(due.startTime)}{where}.</strong>{' '}
                When you collect it, record the pickup here.
              </>
            )}
          </span>
        </span>
        <Button
          size="sm"
          variant="dark"
          to={ready ? `/dashboard/bookings/${due.id}?record=pickup` : `/dashboard/bookings/${due.id}`}
          className="self-start sm:self-auto shrink-0"
        >
          {ready ? 'Record pickup' : 'View booking'}
        </Button>
      </div>
    </div>
  );
}
