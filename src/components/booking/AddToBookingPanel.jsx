import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShoppingCart, RotateCcw, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import PriceDisplay from '../ui/PriceDisplay';
import Step2_TripDetails from './Step2_TripDetails';
import ContractPreviewLink from './ContractPreviewLink';
import { useBookingStore } from '../../store/bookingStore';
import { useCartStore } from '../../store/cartStore';
import { useBookingQuote } from '../../hooks/useBooking';
import { useVehicleWindowBooked } from '../../hooks/useVehicles';
import { useRenterVehicleOverlap } from '../../hooks/useBookings';
import { bookingWindowProblem, tripTypeProblem } from '../../lib/vehicleOptions';
import { billableDays, lineTotal, modeProblem, onlyMode, vehicleSnapshot } from '../../lib/cart';
import { routeProblem } from '../../lib/tripRoute';
import { formatCurrency } from '../../lib/utils';

/**
 * A fresh booking form's starting values from the renter's last search: its dates only if both are there and
 * still ahead (a lapsed start would just be refused at checkout), its mode only if this vehicle offers it
 * (otherwise the vehicle's only mode, as before), and its pickup/return places.
 */
function fromSearch(search = {}, vehicle) {
  const datesUsable = search.startTime && search.endTime && new Date(search.startTime) > new Date();
  const mode = search.bookingMode && !modeProblem(vehicle, search.bookingMode) ? search.bookingMode : onlyMode(vehicle);
  return {
    ...(datesUsable ? { startTime: search.startTime, endTime: search.endTime } : {}),
    bookingMode: mode,
    pickupLocation: search.pickupLocation || '',
    dropoffLocation: search.dropoffLocation || '',
  };
}

/**
 * The booking form on a vehicle's page — for anyone, signed in or not: dates, self-drive or chauffeured, trip
 * type and notes, with the price worked out from the number of days as they choose. Both buttons put the vehicle
 * in the renter's selection (cartStore): "Book now" goes straight on towards checkout, "Add to booking, keep
 * browsing" to Your Booking, where they can add more vehicles. Nothing is sent to the backend here; the booking
 * itself is created after they have an account.
 *
 * The form is the booking draft (bookingStore). Opening a vehicle that is already in the selection loads its
 * details for editing — unless that entry already has a real, created booking (`bookingId`), in which case
 * this is "Book Again" instead: a note explains the existing booking is untouched, and picking different
 * dates starts a genuinely separate one for the same vehicle (see cartStore's `addItem`).
 *
 * @param {object} vehicle — normalised vehicle (see useVehicles `normalizeVehicle`)
 */
export default function AddToBookingPanel({ vehicle }) {
  const navigate = useNavigate();
  const draft = useBookingStore((s) => s.draft);
  const setDraft = useBookingStore((s) => s.setDraft);
  const clearDraft = useBookingStore((s) => s.clearDraft);
  const inCart = useCartStore((s) => s.items.find((i) => i.vehicleId === vehicle.id));
  const addItem = useCartStore((s) => s.addItem);
  // A real booking already exists for this vehicle (created on the backend, not just a local draft) —
  // choosing different dates below starts a separate, new booking rather than editing that one; see
  // cartStore's addItem for how the old booking id is kept or dropped depending on what actually changed.
  const alreadyBooked = !!inCart?.bookingId;

  // Opening a different vehicle starts a fresh form (or the entry it already has in the selection). A fresh
  // form starts with what was just searched for on Browse Vehicles, so the renter isn't asked twice.
  useEffect(() => {
    if (draft.vehicleId === vehicle.id) return;
    clearDraft();
    setDraft({
      vehicleId: vehicle.id,
      ...(inCart
        ? {
            startTime: inCart.startTime,
            endTime: inCart.endTime,
            bookingMode: inCart.bookingMode,
            tripType: inCart.tripType || null,
            renterNotes: inCart.renterNotes || '',
            pickupLocation: inCart.pickupLocation || '',
            dropoffLocation: inCart.dropoffLocation || '',
            deliveryRequested: !!inCart.deliveryRequested,
            passengerCount: inCart.passengerCount ?? null,
            tripOrigin: inCart.tripOrigin || '',
            tripDestination: inCart.tripDestination || '',
          }
        : fromSearch(useBookingStore.getState().search, vehicle)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle.id]);

  // The backend's own quote, once it's loaded, replaces the client-side guess (billableDays/lineTotal) with
  // the exact figure it will actually charge — falling straight back to that guess while it loads or if it
  // errors, so a slow or failed quote never blocks seeing a price.
  const quote = useBookingQuote({ vehicleId: vehicle.id, startTime: draft.startTime, endTime: draft.endTime, deliveryRequested: draft.deliveryRequested, bookingMode: draft.bookingMode });
  const days = quote.data?.numberOfDays ?? billableDays(draft.startTime, draft.endTime);
  const total = quote.data?.totalAmount ?? lineTotal({ startTime: draft.startTime, endTime: draft.endTime, vehicle });
  // Someone else's CONFIRMED/ACTIVE booking already covers these exact dates — checked live (not just the
  // vehicle's own availableFrom/availableTo window, which bookingWindowProblem already covers) so this is
  // caught before submitting, the same way VehiclesPage's "Booked" badge is worked out — see useVehicles.js.
  const windowBooked = useVehicleWindowBooked(vehicle.id, draft.startTime, draft.endTime);
  // A second, independent check for the one case `windowBooked` can't currently be trusted for at all
  // (`VehicleResponse.booked` is confirmed broken live — see docs/backend-requests.md item 25): this renter's
  // own existing bookings, read straight from `GET /bookings/mine` rather than the backend's own (wrong)
  // booked flag. It can only ever catch *this* renter re-booking a vehicle they already hold, not anyone
  // else's booking, but that's exactly the gap that let the same person book and pay for the same vehicle twice.
  const renterOverlap = useRenterVehicleOverlap(vehicle.id, draft.startTime, draft.endTime);

  /**
   * Puts the vehicle in the selection, then goes on: "Add to booking" to Your Booking (to add more vehicles),
   * "Book now" straight past it to checkout — for a visitor, with Create Account already open there (the same
   * route Your Booking's own Book button takes).
   * @param {boolean} [bookNow]
   */
  function handleAdd(bookNow = false) {
    if (!draft.startTime || !draft.endTime || days === 0) {
      toast.error('Please choose your start and end dates.');
      return;
    }
    if (!draft.bookingMode) {
      toast.error('Please choose Self-Drive or Chauffeured.');
      return;
    }
    const problem =
      modeProblem(vehicle, draft.bookingMode) ||
      bookingWindowProblem(vehicle, draft.startTime, draft.endTime) ||
      tripTypeProblem(vehicle, draft.tripType);
    if (problem) {
      toast.error(problem);
      return;
    }
    if (windowBooked.isBooked) {
      toast.error('This vehicle is already booked for those dates. Please choose different dates.');
      return;
    }
    if (renterOverlap.isBooked) {
      toast.error('You already have a booking on this vehicle covering those dates. Please choose different dates.');
      return;
    }
    const noRoute = routeProblem(draft.tripOrigin, draft.tripDestination);
    if (noRoute) {
      toast.error(noRoute);
      return;
    }
    if (draft.deliveryRequested && !String(draft.pickupLocation || '').trim()) {
      toast.error('Please enter the delivery address, or choose to collect the vehicle yourself.');
      return;
    }
    const result = addItem({
      vehicleId: vehicle.id,
      startTime: draft.startTime,
      endTime: draft.endTime,
      bookingMode: draft.bookingMode,
      tripType: draft.tripType || null,
      renterNotes: draft.renterNotes || '',
      pickupLocation: draft.pickupLocation || '',
      dropoffLocation: draft.dropoffLocation || '',
      deliveryRequested: !!draft.deliveryRequested,
      passengerCount: draft.passengerCount ?? null,
      tripOrigin: String(draft.tripOrigin || '').trim(),
      tripDestination: String(draft.tripDestination || '').trim(),
      vehicle: vehicleSnapshot(vehicle),
    });
    const startedNew = alreadyBooked && !useCartStore.getState().items.find((i) => i.vehicleId === vehicle.id)?.bookingId;
    if (bookNow) {
      clearDraft();
      // A visitor lands on checkout and chooses there: Sign up to continue, or I have an account (product owner,
      // 2026-10-25 — nothing opens by itself).
      navigate('/booking/checkout');
      return;
    }
    clearDraft();
    toast.success(
      startedNew
        ? `Starting a new booking for ${vehicle.model} — your existing one is unaffected.`
        : result === 'updated'
          ? 'Booking updated.'
          : `${vehicle.model} added to your booking.`
    );
    navigate('/booking');
  }

  return (
    // See-through like Browse Vehicles' search and filters, and kept short enough that the Book button is on
    // screen without scrolling the page (the column sticks beside the vehicle's details).
    <div className="p-5 flex flex-col gap-3.5 rounded-card border border-line bg-surface shadow-card">
      {alreadyBooked && (
        <p className="text-xs text-muted bg-ink/5 border border-ink/10 rounded-lg px-3 py-2">
          You already have a booking for this vehicle (<span className="text-ink font-medium">My Bookings</span>) — new dates start a separate one.
        </p>
      )}

      <Step2_TripDetails vehicle={vehicle} />

      {windowBooked.isBooked && (
        <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          This vehicle is already booked for those dates. Please choose a different start or end date.
        </p>
      )}

      {!windowBooked.isBooked && renterOverlap.isBooked && (
        <p className="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          You already have a {renterOverlap.booking.status.toLowerCase()} booking on this vehicle covering
          those dates (see My Bookings). Please choose a different start or end date.
        </p>
      )}

      <div className="pt-2.5 border-t border-ink/10 flex flex-col gap-2.5">
        <div className="flex items-end justify-between gap-4">
          <div className="text-sm text-muted">
            {days > 0 ? (
              <>
                {days} {days === 1 ? 'day' : 'days'} × {formatCurrency(vehicle.dailyPrice)}
                {draft.deliveryRequested && quote.data?.deliveryFee > 0 && (
                  <span className="block">+ {formatCurrency(quote.data.deliveryFee)} delivery</span>
                )}
              </>
            ) : (
              'Choose your dates to see the price'
            )}
          </div>
          <PriceDisplay amount={days > 0 ? total : vehicle.dailyPrice} period={days > 0 ? 'estimated' : '/ day'} size="md" />
        </div>
        <Button size="lg" disabled={windowBooked.isBooked || renterOverlap.isBooked} onClick={() => handleAdd(true)}>
          {alreadyBooked ? <RotateCcw size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
          {alreadyBooked ? 'Book Again' : 'Book now'}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button size="sm" disabled={windowBooked.isBooked || renterOverlap.isBooked} onClick={() => handleAdd(false)}>
            <ShoppingCart size={14} aria-hidden="true" />
            {inCart && !alreadyBooked ? 'Update booking' : 'Add to booking'}
          </Button>
          <ContractPreviewLink ownerId={vehicle.ownerId} />
        </div>
      </div>

    </div>
  );
}
