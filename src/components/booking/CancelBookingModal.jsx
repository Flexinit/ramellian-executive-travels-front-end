import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { useEffectivePolicy, useCancelBooking } from '../../hooks/useBookingPolicies';
import { cancellationQuote } from '../../lib/cancellation';

/**
 * The renter's "Cancel booking" confirmation — shared by `BookingRow` (My Bookings) and
 * `BookingDetailPage`, so the policy-aware restriction lives in exactly one place rather than being
 * duplicated (and risking drifting out of sync) between them. Looks up the booking's effective
 * cancellation policy (`GET /booking-policies/bookings/{bookingId}/effective`) and previews what
 * cancelling right now would do — a full refund with enough notice, a reduced one inside the free-
 * cancellation window, or refused outright inside the hard cancellation-deadline window (see
 * `lib/cancellation.js`) — so a renter isn't surprised, and the booking can't be cancelled a few hours
 * before pickup just because the button is there.
 *
 * If the policy fails to load, this fails open — the confirm button still shows, with no refund preview —
 * rather than silently blocking a cancellation on a request that may have nothing to do with whether one
 * is actually allowed. `POST /booking-policies/bookings/{bookingId}/cancel`'s own response is the real,
 * final word either way.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {{id: string, startTime: string}} booking
 */
export default function CancelBookingModal({ isOpen, onClose, booking }) {
  const { data: policy, isLoading: policyLoading } = useEffectivePolicy(isOpen ? booking.id : null);
  const cancelBooking = useCancelBooking();
  const quote = policy ? cancellationQuote(policy, booking.startTime) : null;
  const blocked = quote?.allowed === false;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cancel booking">
      <div className="flex flex-col gap-4">
        {policyLoading ? (
          <div className="flex justify-center py-4">
            <Spinner label="Checking the cancellation policy" />
          </div>
        ) : blocked ? (
          <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            This booking starts too soon to cancel here. Message the owner if you need help.
          </p>
        ) : (
          <p className="text-brand-grey text-sm">
            Cancel this booking? The owner will be told.
            {quote &&
              (quote.refundPercent >= 100
                ? " You'll get a full refund."
                : ` You'll get a ${quote.refundPercent}% refund (late cancellation).`)}
          </p>
        )}
        <div className="flex gap-3 justify-end">
          <Button onClick={onClose}>Keep booking</Button>
          {!blocked && (
            <Button
              variant="danger"
              loading={cancelBooking.isPending}
              disabled={policyLoading}
              onClick={() => cancelBooking.mutate(booking.id, { onSuccess: onClose })}
            >
              Cancel booking
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
