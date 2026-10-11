import React from 'react';
import Input from '../ui/Input';
import { useBookingStore } from '../../store/bookingStore';
import { BOOKING_LOCATION_MAX_LENGTH } from '../../lib/constants';

/**
 * Where the renter wants the vehicle handed over — free text, per the backend's `BookingRequest.pickupLocation`.
 * When they've asked for it to be delivered (`deliveryRequested`), this is the address it's brought to.
 */
export default function PickupLocationInput() {
  const pickupLocation = useBookingStore((s) => s.draft.pickupLocation);
  const delivered = useBookingStore((s) => s.draft.deliveryRequested);
  const setDraft = useBookingStore((s) => s.setDraft);

  return (
    <Input
      label={delivered ? 'Delivery Address' : 'Pickup Location'}
      name="pickupLocation"
      placeholder={delivered ? 'e.g. Westlands, Sarit Centre main entrance' : 'e.g. JKIA Terminal 1'}
      maxLength={BOOKING_LOCATION_MAX_LENGTH}
      value={pickupLocation}
      onChange={(e) => setDraft({ pickupLocation: e.target.value })}
    />
  );
}
