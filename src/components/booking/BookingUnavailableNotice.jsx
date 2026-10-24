import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MessageSquare } from 'lucide-react';
import Button from '../ui/Button';
import { useCartStore } from '../../store/cartStore';
import { isBookingUnfulfilled } from '../../lib/utils';
import { stripPhoneNumbers } from '../../lib/contactGuard';

const COPY = {
  REJECTED: {
    heading: "The owner couldn't fulfil this booking",
    body: "A vehicle can show as available and still turn out not to be — a double booking, a mechanical issue, or something else on the owner's side. We're sorry for the trouble.",
  },
  EXPIRED: {
    heading: "This booking's hold ran out",
    body: 'It was held for you for a short while, but wasn’t paid for in time and is no longer reserved.',
  },
};

/**
 * Shown in place of the flow's next action (accepting the contract, paying, signing) whenever a booking
 * turns out not to be going ahead — because the owner declined it (most often: the vehicle wasn't really
 * available, despite showing as bookable) or its payment hold expired. Deliberately not shown for a
 * `CANCELLED` booking — that status also covers the renter cancelling it themselves (BookingDetailPage),
 * where this "we couldn't fulfil this" framing would be wrong. Renders nothing for any other status.
 *
 * A dead booking like this doesn't just need explaining — if it's still sitting in the renter's cart (the
 * usual case: it was never paid for), it's stuck there too, since `BookingCartPage` hides Edit/Remove once a
 * cart item has a `bookingId` (there's no undoing a real booking once it exists — that guard just doesn't
 * account for the booking having since died on its own). So whenever this booking matches a cart item, this
 * offers **Try booking again** (clears that item's `bookingId` so the next "Book" click creates a fresh one
 * for the same vehicle and dates — the flow re-checks availability before it lets that through) and **Remove
 * from cart**, instead of a plain link to browse; with no matching cart item, it falls back to that link.
 *
 * @param {object} booking — needs `id`, `status`, and optionally `dispatcherNotes` (the owner's note, set
 *   from `PUT /bookings/{id}/status`'s `notes` — the exact response field wasn't confirmable against a
 *   reachable backend; verify against VITE_SWAGGER_URL)
 */
export default function BookingUnavailableNotice({ booking }) {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateItem = useCartStore((s) => s.updateItem);

  if (!isBookingUnfulfilled(booking?.status)) return null;
  const copy = COPY[booking.status] || COPY.REJECTED;
  const note = stripPhoneNumbers(booking.dispatcherNotes || '').text.trim();
  const cartItem = items.find((i) => i.bookingId === booking.id);

  function rebook() {
    updateItem(cartItem.vehicleId, { bookingId: undefined, contractAccepted: false, signed: false });
    navigate('/booking');
  }

  function remove() {
    removeItem(cartItem.vehicleId);
    navigate(items.length > 1 ? '/booking' : '/vehicles');
  }

  return (
    <div role="alert" className="rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 shrink-0 rounded-full bg-red-500/15 flex items-center justify-center">
          <AlertTriangle size={16} className="text-red-600" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-ink text-base font-semibold">{copy.heading}</h2>
          <p className="text-muted text-sm">{copy.body}</p>
          {note && <p className="text-ink text-sm italic">&ldquo;{note}&rdquo;</p>}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Button to={`/messages/booking/${booking.id}`}>
          <MessageSquare size={15} aria-hidden="true" />
          Message the owner
        </Button>
        {cartItem ? (
          <>
            <Button onClick={rebook}>Try booking again</Button>
            <Button variant="danger" onClick={remove}>Remove from cart</Button>
          </>
        ) : (
          <Button to="/vehicles">Browse other vehicles</Button>
        )}
      </div>
    </div>
  );
}
