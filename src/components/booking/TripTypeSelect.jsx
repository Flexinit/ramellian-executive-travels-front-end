import React from 'react';
import { useBookingStore } from '../../store/bookingStore';
import { TRIP_TYPE_LABELS } from '../../lib/constants';
import { bookableTripTypes } from '../../lib/vehicleOptions';
import ToggleChip from '../ui/ToggleChip';

/**
 * Trip types as selectable chips — exactly the ones `vehicle` can be booked for (`bookableTripTypes`), so
 * every chip offered is one the add-to-booking and checkout checks will accept. A vehicle its owner marked
 * **General** (or didn't restrict) offers all of them. Chips, not a dropdown: every option is visible and one
 * tap picks it (a dropdown was tried to save space and the product owner preferred the chips).
 */
export default function TripTypeSelect({ vehicle }) {
  const tripType = useBookingStore((s) => s.draft.tripType);
  const setDraft = useBookingStore((s) => s.setDraft);
  const supported = bookableTripTypes(vehicle);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-brand-white">
        Trip Type <span className="text-brand-grey font-normal">(optional)</span>
      </span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Trip type">
        {supported.map((type) => {
          const active = tripType === type;
          return (
            <ToggleChip key={type} active={active} onClick={() => setDraft({ tripType: active ? null : type })}>
              {TRIP_TYPE_LABELS[type] || type}
            </ToggleChip>
          );
        })}
      </div>
    </div>
  );
}
