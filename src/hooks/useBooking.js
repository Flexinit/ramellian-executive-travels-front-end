import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiPost } from '../lib/api';
import { useCartStore } from '../store/cartStore';
import { stripPhoneNumbers } from '../lib/contactGuard';
import { notesWithRoute } from '../lib/tripRoute';
import { apiErrorMessage } from '../lib/apiError';

/**
 * Query options for a price quote — `POST /bookings/quote` `{ vehicleId, startTime, endTime }` →
 * `{ vehicleId, numberOfDays, pricePerDay, baseAmount, platformFee, totalAmount }`. Confirmed live: public,
 * no login needed (404 "Vehicle not found" on a bad id, not 401/403) — added to the backend 2026-09-27 in
 * response to docs/backend-requests.md item 3, so the estimate shown before a booking exists can match the
 * backend's own rounding exactly instead of guessing at it (see `billableDays`/`lineTotal` in lib/cart.js,
 * kept as the fallback while this is loading or if it errors — a quote failing must never block seeing a
 * price). The response's own `estimatedAmount` field was replaced by `baseAmount`/`platformFee`/`totalAmount`
 * on 2026-10-03 (the platform commission split is now broken out) — confirmed live; every caller reads
 * `totalAmount` now. `BookingResponse` (a booking that already exists) is unrelated and still has its own
 * `estimatedAmount`, unchanged, alongside its own new `baseAmount`/`platformFee`.
 *
 * A plain options object (not a hook) so it can be used both directly, via `useBookingQuote`, and inside
 * `useQueries` for several vehicles at once (BookingCartPage, BookingCheckoutPage) — one shared shape keeps
 * their cache entries the same query.
 */
export function bookingQuoteQuery({ vehicleId, startTime, endTime, deliveryRequested = false, bookingMode }) {
  // `deliveryRequested` (live spec 2026-10-09): the quote then includes the platform's flat delivery fee in
  // `deliveryFee` and `totalAmount`. `bookingMode` (live spec 2026-10-16): CHAUFFEURED can add a `driverCharge`.
  // Public — no login needed.
  return {
    queryKey: ['booking-quote', vehicleId, startTime, endTime, !!deliveryRequested, bookingMode || null],
    queryFn: () =>
      apiPost('/bookings/quote', { vehicleId, startTime, endTime, deliveryRequested: !!deliveryRequested, ...(bookingMode ? { bookingMode } : {}) }),
    enabled: !!(vehicleId && startTime && endTime),
    staleTime: 60 * 1000,
    retry: false,
  };
}

/** @see bookingQuoteQuery */
export function useBookingQuote(args) {
  return useQuery(bookingQuoteQuery(args));
}

/** One item's `BookingRequest` payload, per the backend's own schema. */
function bookingRequestFor(item) {
  return {
    vehicleId: item.vehicleId,
    startTime: item.startTime,
    endTime: item.endTime,
    bookingMode: item.bookingMode,
    tripType: item.tripType || undefined,
    // Stripped once more on the way out: phone numbers can't be shared through the portal. The trip's route goes
    // first in the notes until the backend stores it itself (lib/tripRoute.js).
    renterNotes: stripPhoneNumbers(notesWithRoute(item.tripOrigin, item.tripDestination, item.renterNotes || '')).text || undefined,
    tripOrigin: item.tripOrigin || undefined,
    tripDestination: item.tripDestination || undefined,
    pickupLocation: item.pickupLocation || undefined,
    dropoffLocation: item.dropoffLocation || undefined,
    // Delivered to the renter (a flat fee, set in Platform Settings) or collected by them (no fee).
    deliveryRequested: !!item.deliveryRequested,
    // Optional (BookingRequest.passengerCount, live 2026-10-16) — shown on the contract.
    passengerCount: item.passengerCount || undefined,
  };
}

/**
 * Starts the renter's selection: creates its booking(s) and opens the first one's contract.
 *  - **One vehicle** — unchanged from before a combined checkout existed: `POST /bookings/create` for that
 *    one vehicle. Its own Pesapal checkout follows once its contract is accepted (PaymentPage).
 *  - **Two or more vehicles** — `POST /bookings/create-batch` (`docs/backend-requests.md` item 1, added by
 *    the backend 2026-09-27) creates every booking in one call, under one `groupId` (cartStore). They are
 *    still contracted one at a time (each owner's own terms), but paid for **once**, together — see
 *    `useAcceptContract`, which walks from one booking's accepted contract to the next, and once every
 *    contract in the group is accepted, on to `GroupPaymentPage`.
 *
 * Either way, a vehicle whose booking already exists (the renter came back part-way) is never booked twice —
 * this only runs once per selection, right when "Continue to contract" is first pressed on checkout.
 * A 422 (identity / licence documents not approved yet) is deliberately not toasted: the caller shows the
 * document gate instead. Everything else still gets an explained message — never a bare "please try again" —
 * via `apiErrorMessage`, which turns a bodyless 403 into "your account may not have permission for this, or
 * your login needs refreshing" rather than saying nothing useful at all.
 *
 * A booking can now be created before documents are approved — `BookingResponse` gained a `warnings: string[]`
 * field (confirmed against the live OpenAPI spec 2026-10-06) the backend uses to say so (e.g. "upload your ID
 * before pickup") instead of refusing outright. Every booking's own `warnings` (deduplicated, across the whole
 * batch for a group) are carried along to the contract page as navigation `state`, so it can show them as a
 * one-time notice right where the renter lands next — see ContractPage.jsx.
 */
export function useStartNextBooking() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { items, setBookingId, setGroupId } = useCartStore.getState();
      if (items.length === 0) return null;

      // The cart is kept in localStorage across visits, so a trip's start time — chosen whenever that
      // vehicle was added, possibly in an earlier session — can quietly lapse into the past before this
      // ever runs. The backend then refuses the whole request outright ("startTime: must be a future
      // date", or "bookings[0].startTime: ..." for a batch), which otherwise surfaced as a raw,
      // unattributed error. Caught here so every caller (this page's own "Continue to contract" and
      // BookingConfirmPage's "Continue with the next vehicle", which has no per-item validation of its
      // own) gets a clear, actionable message instead.
      const stale = items.find((i) => !i.bookingId && i.startTime && new Date(i.startTime) <= new Date());
      if (stale) {
        const label = stale.vehicle?.model || 'One of the vehicles in your booking';
        const message = `${label}'s trip start time has passed since it was added. Please remove it and choose new dates.`;
        throw { response: { data: { message } } };
      }

      if (items.length === 1) {
        const next = items[0];
        if (next.bookingId) return { vehicleId: next.vehicleId, bookingId: next.bookingId, warnings: [] };
        const booking = await apiPost('/bookings/create', bookingRequestFor(next));
        setBookingId(next.vehicleId, booking.id);
        return { vehicleId: next.vehicleId, bookingId: booking.id, warnings: booking.warnings || [] };
      }

      // Already batched (the renter left and came back before finishing any contract) — nothing to create.
      const alreadyStarted = items.every((i) => i.bookingId);
      if (alreadyStarted) return { vehicleId: items[0].vehicleId, bookingId: items[0].bookingId, warnings: [] };

      const group = await apiPost('/bookings/create-batch', { bookings: items.map(bookingRequestFor) });
      setGroupId(group.groupId);
      group.bookings.forEach((booking) => setBookingId(booking.vehicleId, booking.id));
      const first = group.bookings[0];
      // One per-booking `warnings` array each, deduplicated into one list — a renter paying for several
      // vehicles at once only needs to be told "upload your licence" once, not per vehicle.
      const warnings = [...new Set(group.bookings.flatMap((b) => b.warnings || []))];
      return { vehicleId: first.vehicleId, bookingId: first.id, warnings };
    },
    onSuccess: (started) => {
      if (!started) return;
      // The default query staleTime is 5 minutes (see lib/constants.js), so without this, My Bookings
      // would keep showing its pre-booking snapshot — missing the one just created — for up to that long.
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate(`/book/${started.vehicleId}/contract`, { state: { bookingId: started.bookingId, warnings: started.warnings } });
    },
    onError: (error) => {
      if (error?.response?.status !== 422) {
        toast.error(apiErrorMessage(error, 'Could not create your booking.'));
      }
    },
  });
}
