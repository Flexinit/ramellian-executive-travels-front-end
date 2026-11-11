import React from 'react';
import { ClipboardCheck, Eye, Gauge } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import BookingStatusBadge from '../components/booking/BookingStatusBadge';
import { HandoverRecord } from '../components/booking/HandoverHistory';
import { useMyBookings, useOwnerBookings } from '../hooks/useBookings';
import { useHandoversFor } from '../hooks/useVehicleHandover';
import { useVehicle } from '../hooks/useVehicles';
import { usePagination } from '../hooks/usePagination';
import { BOOKING_STATUSES } from '../lib/constants';
import { formatDateRange } from '../lib/utils';

/** Only a booking that has been collected can have a handover: out now (Active) or back (Completed). */
const HANDED_OVER = [BOOKING_STATUSES.ACTIVE, BOOKING_STATUSES.COMPLETED];

const SIDES = {
  renter: { useList: useMyBookings, bookingPath: '/dashboard/bookings', intro: 'The pickups and returns recorded on your bookings, newest trip first.' },
  owner: { useList: useOwnerBookings, bookingPath: '/owner/bookings', intro: 'The pickups and returns recorded on your vehicles, newest trip first.' },
};

/** One booking's handovers: pickup and return side by side, the distance driven between them, and View booking. */
function BookingHandovers({ booking, handovers, bookingPath }) {
  // The booking list carries only the vehicle's id (as on My Bookings): its name comes from the vehicle, cached.
  const { data: vehicle } = useVehicle(booking.vehicleId);
  const pickup = handovers.find((h) => h.type === 'PICKUP');
  const dropoff = handovers.find((h) => h.type === 'DROPOFF');
  const driven = pickup?.odometerReading != null && dropoff?.odometerReading != null ? dropoff.odometerReading - pickup.odometerReading : null;
  const name = vehicle?.model || booking.vehicleModel || handovers[0]?.vehicleModel || 'Vehicle';
  const plate = vehicle?.registrationNumber || handovers[0]?.vehicleRegistration;

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-ink text-base font-semibold">
            {name}
            {plate && <span className="text-muted font-normal"> · {plate}</span>}
          </h2>
          <p className="text-sm text-muted">
            {formatDateRange(booking.startTime, booking.endTime)}
            {booking.renterName ? ` · ${booking.renterName}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BookingStatusBadge status={booking.status} />
          <Button size="sm" to={`${bookingPath}/${booking.id}`}>
            <Eye size={14} aria-hidden="true" /> View booking
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[pickup, dropoff].filter(Boolean).map((h) => (
          <div key={h.id} className="rounded-xl border border-ink/10 px-4 pt-3">
            <HandoverRecord handover={h} />
          </div>
        ))}
      </div>
      {driven != null && (
        <p className="text-sm text-ink inline-flex items-center gap-1.5">
          <Gauge size={14} className="text-accent" aria-hidden="true" />
          Driven: {driven.toLocaleString()} km
        </p>
      )}
    </Card>
  );
}

/**
 * Handovers (`/dashboard/handovers` for the renter, `/owner/handovers` for the owner): every booking with a recorded
 * pickup or return — odometer and its photo, fuel, condition, damage, who signed — and a way to its booking. The
 * backend only lists handovers per booking (`GET /handovers/bookings/{bookingId}`), so the collected bookings come from
 * the side's own bookings list, their handovers are loaded (`useHandoversFor`), and those that have any are listed,
 * a page at a time.
 *
 * @param {'renter'|'owner'} side
 */
export default function HandoversPage({ side = 'renter' }) {
  const { useList, bookingPath, intro } = SIDES[side];
  const { data, isLoading, isError, refetch } = useList();
  const collected = (Array.isArray(data) ? data : [])
    .filter((b) => HANDED_OVER.includes(b.status))
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  const handovers = useHandoversFor(collected.map((b) => b.id));
  const recorded = collected.filter((b) => handovers.byBooking[b.id]?.length > 0);
  const pages = usePagination(recorded, 10);
  const loading = isLoading || handovers.isLoading;

  return (
    <PageWrapper>
      <PageTitle title="Handovers" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Handovers</h1>
          <p className="text-muted text-sm mt-1">{intro}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" label="Loading the handovers" /></div>
        ) : isError || handovers.isError ? (
          <ErrorBanner message="We couldn't load the handovers just now." onRetry={refetch} />
        ) : recorded.length === 0 ? (
          <Card>
            <EmptyState
              icon={ClipboardCheck}
              title="No handovers yet"
              description="Once a vehicle is collected and returned, its pickup and return records show here."
            />
          </Card>
        ) : (
          <>
            <ul aria-label="Handovers" className="flex flex-col gap-4">
              {pages.pageItems.map((b) => (
                <li key={b.id}>
                  <BookingHandovers booking={b} handovers={handovers.byBooking[b.id]} bookingPath={bookingPath} />
                </li>
              ))}
            </ul>
            <Pagination {...pages.props} noun="bookings" />
          </>
        )}
      </div>
    </PageWrapper>
  );
}
