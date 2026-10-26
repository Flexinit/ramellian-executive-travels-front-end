import React, { useEffect, useState } from 'react';
import Select from '../ui/Select';
import PayoutFormModal from './PayoutFormModal';
import { useAllBookings } from '../../hooks/useBookings';
import { useCreateDisbursement, useDisbursements } from '../../hooks/useDisbursements';
import { formatDateRange } from '../../lib/utils';

const PAID = ['CONFIRMED', 'ACTIVE', 'COMPLETED'];

/**
 * **Create payout** from Owner Payouts itself — the same as a booking page's (`BookingPayoutCard`), with the booking
 * picked here: paid bookings (confirmed, active, completed) that don't have a payout yet in any status
 * (`POST /admin/disbursements/bookings/{bookingId}`). Product owner, 2026-10-26: the payout buttons on this page too.
 *
 * @param {boolean} isOpen @param {function} onClose
 */
export default function CreatePayoutModal({ isOpen, onClose }) {
  const create = useCreateDisbursement();
  const { data: bookings, isLoading } = useAllBookings();
  const lists = [
    useDisbursements('PENDING', { enabled: isOpen }),
    useDisbursements('PROCESSING', { enabled: isOpen }),
    useDisbursements('COMPLETED', { enabled: isOpen }),
    useDisbursements('FAILED', { enabled: isOpen }),
  ];
  const [bookingId, setBookingId] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setBookingId('');
    setError(null);
  }, [isOpen]);

  const hasPayout = new Set(lists.flatMap((q) => (Array.isArray(q.data) ? q.data : [])).map((d) => d.bookingId));
  const options = (Array.isArray(bookings) ? bookings : [])
    .filter((b) => PAID.includes(b.status) && !hasPayout.has(b.id))
    .map((b) => ({
      value: b.id,
      label: [b.vehicleModel || 'Vehicle', b.startTime && formatDateRange(b.startTime, b.endTime), b.renterEmail].filter(Boolean).join(' · '),
    }));
  const loading = isLoading || lists.some((q) => q.isLoading);

  function submit(fields) {
    if (!bookingId) return setError('Choose the booking this payout is for.');
    create.mutate({ bookingId, ...fields }, { onSuccess: onClose });
  }

  return (
    <PayoutFormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create payout"
      submitLabel="Create payout"
      mutation={create}
      intro="For a paid booking whose payout wasn't created automatically. It's created as To pay — then send it, or record it as paid by hand."
      onSubmit={submit}
    >
      <Select
        label="Booking"
        name="bookingId"
        placeholder={loading ? 'Loading bookings…' : options.length ? 'Choose a booking' : 'No paid bookings without a payout'}
        options={options}
        value={bookingId}
        onChange={(e) => { setBookingId(e.target.value); setError(null); }}
        disabled={loading || !options.length}
        error={error}
      />
    </PayoutFormModal>
  );
}
