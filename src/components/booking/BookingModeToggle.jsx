import React from 'react';
import { useBookingStore } from '../../store/bookingStore';
import { BOOKING_MODES } from '../../lib/constants';
import SegmentedControl from '../ui/SegmentedControl';

const OPTIONS = [
  { value: BOOKING_MODES.SELF_DRIVE, label: 'Self-Drive' },
  { value: BOOKING_MODES.CHAUFFEURED, label: 'Chauffeured' },
];

/** Toggles the booking draft's mode between self-drive and chauffeured. Small, so it fits half a narrow column. */
export default function BookingModeToggle() {
  const bookingMode = useBookingStore((s) => s.draft.bookingMode);
  const setDraft = useBookingStore((s) => s.setDraft);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-brand-white">Booking Mode</span>
      <SegmentedControl
        label="Booking mode"
        options={OPTIONS}
        value={bookingMode}
        onChange={(value) => setDraft({ bookingMode: value })}
        size="sm"
      />
    </div>
  );
}
