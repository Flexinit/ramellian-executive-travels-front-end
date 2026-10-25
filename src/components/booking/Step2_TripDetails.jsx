import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Plus } from 'lucide-react';
import DateRangePicker, { combineDateAndTime, DEFAULT_START_TIME, DEFAULT_END_TIME } from '../forms/DateRangePicker';
import BookingModeToggle from './BookingModeToggle';
import TripTypeSelect from './TripTypeSelect';
import RenterNotesTextarea from './RenterNotesTextarea';
import PickupLocationInput from './PickupLocationInput';
import TripRouteInputs from './TripRouteInputs';
import DeliveryChoice from './DeliveryChoice';
import Input from '../ui/Input';
import DropoffLocationInput from './DropoffLocationInput';
import { useBookingStore } from '../../store/bookingStore';
import { useMyBookings } from '../../hooks/useBookings';
import { bookedPeriods } from '../../lib/vehicleBookings';
import { formatDateRange } from '../../lib/utils';
import { useAuthStore } from '../../store/authStore';
import { BOOKING_MODES } from '../../lib/constants';

function timeFromDate(date, fallback) {
  if (!date) return fallback;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Dates, mode, trip type, and notes. Sits inline on the vehicle's own page (AddToBookingPanel is its only
 * caller) rather than as a wizard step, so it's kept compact — no heading of its own (the panel around it
 * already gives that context) and a shorter notes box, so the vehicle page scrolls as little as this form
 * allows.
 */
export default function Step2_TripDetails({ vehicle }) {
  const draft = useBookingStore((s) => s.draft);
  const setDraft = useBookingStore((s) => s.setDraft);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  // The renter's own existing bookings on this vehicle — the one source of "when is this vehicle taken"
  // this page can actually trust right now, since `VehicleResponse.booked` was confirmed live 2026-10-03 to
  // stay wrong even for a real Confirmed booking (docs/backend-requests.md item 25). This can only ever
  // reflect *this* renter's own bookings, not anyone else's, so the calendar still can't show a vehicle as
  // unavailable for a stranger's booking — but it does mean a renter can see, and can no longer pick dates
  // that collide with, a vehicle they already hold themselves (exactly the gap that let the same renter
  // book and pay for the same vehicle twice).
  const { data: myBookings } = useMyBookings({ enabled: isAuthenticated });
  const myPeriods = isAuthenticated ? bookedPeriods(myBookings, vehicle.id) : [];

  const startDate = draft.startTime ? new Date(draft.startTime) : null;
  const endDate = draft.endTime ? new Date(draft.endTime) : null;
  const dateRange = {
    startDate,
    endDate,
    startTime: timeFromDate(startDate, DEFAULT_START_TIME),
    endTime: timeFromDate(endDate, DEFAULT_END_TIME),
  };

  function handleDateRangeChange(next) {
    const start = combineDateAndTime(next.startDate, next.startTime);
    const end = combineDateAndTime(next.endDate, next.endTime);
    setDraft({
      startTime: start ? start.toISOString() : null,
      endTime: end ? end.toISOString() : null,
    });
  }

  // Special instructions are optional, so the box stays folded away behind a link until wanted (or already
  // has text) — one of the ways this form is kept short enough that the Book button is on screen without
  // scrolling the page.
  const [notesOpen, setNotesOpen] = useState(!!draft.renterNotes || !!draft.passengerCount);
  const seats = Number(vehicle?.capacity) || undefined;

  // Only the questions that apply are asked (product owner, 2026-10-25):
  //  - chauffeured: the driver brings the car, so there's no "Getting the vehicle" choice — but where the chauffeur
  //    picks the renter up and drops them off still matters;
  //  - self-drive, collecting it: it's collected from and returned to the vehicle's own base, so no pickup or
  //    drop-off fields (the contract uses the base location);
  //  - self-drive, delivered: the delivery address and where it's returned.
  // Whatever a hidden field held is cleared, so it's never sent with the booking.
  const chauffeured = draft.bookingMode === BOOKING_MODES.CHAUFFEURED;
  const collecting = !chauffeured && !draft.deliveryRequested;
  useEffect(() => {
    if (chauffeured && draft.deliveryRequested) setDraft({ deliveryRequested: false });
  }, [chauffeured, draft.deliveryRequested, setDraft]);
  useEffect(() => {
    if (collecting && (draft.pickupLocation || draft.dropoffLocation)) setDraft({ pickupLocation: '', dropoffLocation: '' });
  }, [collecting, draft.pickupLocation, draft.dropoffLocation, setDraft]);

  return (
    <div className="flex flex-col gap-3.5">
      {/* Full width: side by side with the mode toggle, the chosen dates and times got cut off. */}
      <DateRangePicker value={dateRange} onChange={handleDateRangeChange} disabledRanges={myPeriods} />

      {/* One above the other: this form sits in a narrow column beside the vehicle, where side by side cut the
          switches off ("Chauffeur…"). */}
      <div className="flex flex-col gap-3.5">
        <BookingModeToggle />
        {!chauffeured && <DeliveryChoice vehicle={vehicle} />}
      </div>

      {myPeriods.length > 0 && (
        <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          You already have this vehicle booked for {myPeriods.map((p) => formatDateRange(p.start, p.end)).join(', ')} —
          those dates are struck through above and can't be picked again.
        </p>
      )}

      <TripRouteInputs />

      {collecting ? (
        vehicle?.location && (
          <p className="inline-flex items-start gap-1.5 text-sm text-muted">
            <MapPin size={14} className="mt-0.5 shrink-0 text-icon" aria-hidden="true" />
            <span>
              You collect it from and return it to <span className="font-medium text-ink">{vehicle.location}</span>.
            </span>
          </p>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PickupLocationInput />
          <DropoffLocationInput />
        </div>
      )}

      <TripTypeSelect vehicle={vehicle} />

      {notesOpen ? (
        <>
          <Input
            label="Passengers (optional)"
            type="number"
            inputMode="numeric"
            min="1"
            max={seats}
            placeholder={seats ? `Up to ${seats}` : 'e.g. 3'}
            value={draft.passengerCount ?? ''}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              setDraft({ passengerCount: Number.isFinite(n) && n > 0 ? Math.min(n, seats || n) : null });
            }}
            className="max-w-[12rem]"
          />
          <RenterNotesTextarea rows={2} />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setNotesOpen(true)}
          className="inline-flex items-center gap-1.5 self-start text-accent text-sm font-semibold hover:text-accent-hover transition-colors focus-ring rounded-md py-1.5 -my-1.5"
        >
          <Plus size={14} aria-hidden="true" />
          Add passengers or special instructions
        </button>
      )}
    </div>
  );
}
