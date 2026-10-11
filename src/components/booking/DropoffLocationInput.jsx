import React from 'react';
import Input from '../ui/Input';
import { useBookingStore } from '../../store/bookingStore';
import { BOOKING_LOCATION_MAX_LENGTH } from '../../lib/constants';

/** Where the renter will leave the vehicle — free text, per the backend's `BookingRequest.dropoffLocation`. */
export default function DropoffLocationInput() {
  const dropoffLocation = useBookingStore((s) => s.draft.dropoffLocation);
  const setDraft = useBookingStore((s) => s.setDraft);

  return (
    <Input
      label="Drop-off Location"
      name="dropoffLocation"
      placeholder="e.g. Nairobi CBD"
      maxLength={BOOKING_LOCATION_MAX_LENGTH}
      value={dropoffLocation}
      onChange={(e) => setDraft({ dropoffLocation: e.target.value })}
    />
  );
}
