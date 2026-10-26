import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { apiErrorMessage } from '../../lib/apiError';

/**
 * A payout's details — amount, the owner's phone (where an M-Pesa payout goes) and notes — for creating one by hand
 * (`ManualDisbursementRequest`) or correcting one before it's sent or retried (`UpdateDisbursementRequest`). Every field
 * is optional in the spec; an empty one is left to the backend (it works out the owner's share and phone itself).
 *
 * @param {boolean} isOpen @param {function} onClose
 * @param {string} title @param {string} submitLabel
 * @param {{ amount?: number, ownerPhone?: string, notes?: string }} [initial]
 * @param {function} onSubmit — gets `{ amount, ownerPhone, notes }` (strings, trimmed)
 * @param {object} mutation — the create/update mutation (for its pending/error state)
 * @param {React.ReactNode} [intro]
 * @param {React.ReactNode} [children] — extra fields shown before the amount (e.g. which booking)
 */
export default function PayoutFormModal({ isOpen, onClose, title, submitLabel, initial = {}, onSubmit, mutation, intro, children }) {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setAmount(initial.amount != null ? String(initial.amount) : '');
    setPhone(initial.ownerPhone || '');
    setNotes(initial.notes || '');
    setError(null);
    mutation.reset?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function submit(e) {
    e.preventDefault();
    if (amount !== '' && (Number.isNaN(Number(amount)) || Number(amount) <= 0)) {
      setError({ amount: 'Enter an amount above 0, or leave it empty for the owner’s share.' });
      return;
    }
    if (phone.trim() && phone.replace(/\D/g, '').length < 9) {
      setError({ phone: 'Enter the full number, with its country code.' });
      return;
    }
    setError(null);
    onSubmit({ amount: amount.trim(), ownerPhone: phone.trim(), notes: notes.trim() });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {intro && <div className="text-sm text-muted">{intro}</div>}
        {children}
        <Input
          label="Amount (KES)"
          type="number"
          min="0"
          step="1"
          inputMode="decimal"
          hint="Leave empty for the owner's share of the booking"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={error?.amount}
        />
        <Input
          label="Owner's phone (M-Pesa)"
          type="tel"
          inputMode="tel"
          hint="Where the payout is sent, e.g. +254 712 345 678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={error?.phone}
        />
        <Textarea label="Notes (optional)" name="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {mutation.isError && <p role="alert" className="text-sm text-red-600">{apiErrorMessage(mutation.error, "Couldn't save the payout.")}</p>}
        <div className="flex flex-wrap gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}
