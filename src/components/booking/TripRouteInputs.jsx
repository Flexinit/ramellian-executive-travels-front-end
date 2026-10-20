import React from 'react';
import Input from '../ui/Input';
import { useBookingStore } from '../../store/bookingStore';
import { BOOKING_LOCATION_MAX_LENGTH } from '../../lib/constants';

/**
 * Where the trip starts and where it's going — both required (product rule 2026-10-17) and written into the rental
 * contract. Not the same as where the car is collected and returned (pick-up / drop-off): a car collected in
 * Nairobi CBD can be going to Mombasa. See `tripRoute` (lib/tripRoute.js) for how they're sent.
 */
export default function TripRouteInputs() {
  const origin = useBookingStore((s) => s.draft.tripOrigin);
  const destination = useBookingStore((s) => s.draft.tripDestination);
  const setDraft = useBookingStore((s) => s.setDraft);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Input
        label="Travelling from"
        required
        name="tripOrigin"
        placeholder="e.g. Nairobi"
        maxLength={BOOKING_LOCATION_MAX_LENGTH}
        value={origin || ''}
        onChange={(e) => setDraft({ tripOrigin: e.target.value })}
      />
      <Input
        label="Travelling to"
        required
        name="tripDestination"
        placeholder="e.g. Diani Beach"
        maxLength={BOOKING_LOCATION_MAX_LENGTH}
        value={destination || ''}
        onChange={(e) => setDraft({ tripDestination: e.target.value })}
      />
    </div>
  );
}
