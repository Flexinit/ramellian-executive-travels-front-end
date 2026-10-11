import React, { useState } from 'react';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import { useUpdateBookingStatus } from '../../hooks/useBookings';
import { BOOKING_STATUSES } from '../../lib/constants';
import { bookingStatusLabel } from '../../lib/utils';
import { stripPhoneNumbers } from '../../lib/contactGuard';

const OPTIONS = Object.values(BOOKING_STATUSES).map((value) => ({ value, label: bookingStatusLabel(value) }));

/**
 * Move a booking to another status, with a note (`PUT /bookings/{id}/status`), for the owner of the vehicle or an
 * administrator. The spec doesn't list the statuses the backend accepts — these are the ones the portal knows —
 * so if the backend refuses one, its message is shown and the booking stays as it was.
 *
 * @param {object} booking
 */
export default function BookingStatusControl({ booking }) {
  const update = useUpdateBookingStatus();
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');

  function submit(e) {
    e.preventDefault();
    const note = stripPhoneNumbers(notes).text.trim();
    update.mutate({ bookingId: booking.id, status, notes: note }, { onSuccess: () => { setStatus(''); setNotes(''); } });
  }

  return (
    <form onSubmit={submit} className="bg-brand-navy border border-white/10 rounded-2xl p-5 flex flex-col gap-4" aria-label="Update booking status">
      <h2 className="font-heading text-brand-white text-base font-semibold">Update status</h2>
      <Select
        label="Move this booking to"
        name="status"
        options={OPTIONS.filter((o) => o.value !== booking.status)}
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        placeholder="Choose a status"
        className="w-full sm:w-64"
      />
      <Textarea label="Note (optional)" name="notes" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Button type="submit" className="self-start" disabled={!status} loading={update.isPending}>
        Update status
      </Button>
    </form>
  );
}
