import React, { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useConfirmPayment } from '../../hooks/useBookings';

/**
 * Record a payment against a booking by hand (`POST /payments/bookings/{id}/confirm`): how it was paid and the
 * transaction reference, both required by the backend. For a payment taken outside the online checkout.
 *
 * @param {object} booking
 */
export default function ConfirmPaymentForm({ booking }) {
  const confirm = useConfirmPayment();
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const ready = method.trim() && reference.trim();

  function submit(e) {
    e.preventDefault();
    confirm.mutate(
      { bookingId: booking.id, paymentMethod: method.trim(), transactionReference: reference.trim() },
      { onSuccess: () => { setMethod(''); setReference(''); } }
    );
  }

  return (
    <form onSubmit={submit} className="bg-brand-navy border border-white/10 rounded-2xl p-5 flex flex-col gap-4" aria-label="Record a payment">
      <div>
        <h2 className="font-heading text-brand-white text-base font-semibold">Record a payment</h2>
        <p className="text-brand-grey text-xs mt-1">For a payment taken outside the online checkout.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Payment method" name="paymentMethod" placeholder="e.g. M-Pesa, bank transfer" value={method} onChange={(e) => setMethod(e.target.value)} />
        <Input label="Transaction reference" name="transactionReference" value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>
      <Button type="submit" className="self-start" disabled={!ready} loading={confirm.isPending}>
        Record payment
      </Button>
    </form>
  );
}
