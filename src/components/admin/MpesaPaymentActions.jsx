import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { PencilLine, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useOverrideMpesaPayment, useSyncMpesaPayment } from '../../hooks/usePayment';
import { PAYMENT_STATUSES } from '../../lib/constants';

const STATUS_OPTIONS = [
  { value: PAYMENT_STATUSES.SUCCESSFUL, label: 'Paid (successful)' },
  { value: PAYMENT_STATUSES.FAILED, label: 'Failed' },
  { value: PAYMENT_STATUSES.PENDING, label: 'Pending' },
];

const STATUS_WORD = { SUCCESSFUL: 'paid', FAILED: 'failed', PENDING: 'still pending', INVALID: 'invalid' };

/**
 * Fixing an M-Pesa payment by hand (admin only), for one whose result never came back from Safaricom:
 *  - **Check with Safaricom** asks Safaricom for the result and records it (`useSyncMpesaPayment`);
 *  - **Set status** sets it outright (`useOverrideMpesaPayment`), for when Safaricom can't be reached — in a panel that
 *    opens below (not a dialog: this sits inside one on Payment Transactions), with the M-Pesa confirmation code for a
 *    payment set as paid, since it changes what the renter and owner are told.
 * Used on Payment Transactions (a transaction's details) and on a booking's transaction page (each M-Pesa charge).
 *
 * @param {string} paymentId @param {string} [status] — the payment's status now, picked first in **Set status**
 */
export default function MpesaPaymentActions({ paymentId, status }) {
  const sync = useSyncMpesaPayment();
  const override = useOverrideMpesaPayment();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState('');
  const [receipt, setReceipt] = useState('');
  const [error, setError] = useState(null);

  function check() {
    sync.mutate(paymentId, {
      onSuccess: (p) => toast.success(p?.status ? `Safaricom says this payment is ${STATUS_WORD[p.status] || p.status.toLowerCase()}.` : 'Checked with Safaricom.'),
    });
  }

  function start() {
    setNext(status && STATUS_OPTIONS.some((o) => o.value === status) ? status : '');
    setReceipt('');
    setError(null);
    setOpen(true);
  }

  function save() {
    if (!next) {
      setError('Choose a status.');
      return;
    }
    const code = next === PAYMENT_STATUSES.SUCCESSFUL ? receipt.trim().toUpperCase() : '';
    override.mutate({ paymentId, status: next, receipt: code || undefined }, { onSuccess: () => setOpen(false) });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" loading={sync.isPending} disabled={sync.isPending} onClick={check}>
          {!sync.isPending && <RefreshCw size={14} aria-hidden="true" />} Check with Safaricom
        </Button>
        <Button size="sm" variant="outline" onClick={start} disabled={open} aria-expanded={open}>
          <PencilLine size={14} aria-hidden="true" /> Set status
        </Button>
      </div>
      {open && (
        <div role="group" aria-label="Set M-Pesa payment status" className="rounded-tile border border-line p-4 flex flex-col gap-4">
          <p className="text-sm text-ink">
            Only when Safaricom can&apos;t be reached and you&apos;ve confirmed the payment yourself, for example from the
            M-Pesa statement. Try <strong>Check with Safaricom</strong> first.
          </p>
          <Select
            label="Status"
            placeholder="Choose a status"
            options={STATUS_OPTIONS}
            value={next}
            onChange={(e) => { setNext(e.target.value); setError(null); }}
            error={error}
          />
          {next === PAYMENT_STATUSES.SUCCESSFUL && (
            <Input
              label="M-Pesa confirmation code (optional)"
              hint="From the M-Pesa message or statement, e.g. SGH7XK2ABC."
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
              autoComplete="off"
              maxLength={20}
            />
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={override.isPending} disabled={override.isPending} onClick={save}>Save status</Button>
          </div>
        </div>
      )}
    </div>
  );
}
