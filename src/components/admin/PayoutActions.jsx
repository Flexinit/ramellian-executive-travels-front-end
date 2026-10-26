import React, { useState } from 'react';
import { CheckCircle2, Pencil, RefreshCw, RotateCcw, Send, XCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import { PAYOUT_LABEL, useResolveDisbursement, useSyncDisbursement, useUpdateDisbursement } from '../../hooks/useDisbursements';
import PayoutFormModal from './PayoutFormModal';
import { apiErrorMessage } from '../../lib/apiError';
import { formatCurrency } from '../../lib/utils';

/**
 * What can be done with one owner payout, wherever it's shown (Owner Payouts, a booking's page) — for when the
 * automatic flow needs a hand (product owner, 2026-10-26: two clearly separate ways to pay):
 *
 *  - **Send payout now** (to pay, or **Try again** on a failed one): asks the system to pay the owner through the
 *    payment provider — `POST /admin/disbursements/{id}/trigger` with no reference. It then shows as Processing until
 *    the provider confirms (**Check status**). Confirmed first, since it moves money. (Backend item 47 asks to confirm
 *    that a trigger without a reference really sends the money.)
 *  - **Already paid by hand**: records a payment made outside the system (M-Pesa, bank) — the same trigger, with the
 *    payment's reference, which is required.
 *  - **Failed**: marks it failed with what went wrong (`.../fail`).
 *  - **Check status** on a processing one (`.../sync`).
 *  - **Edit** (to pay or failed): corrects the owner's phone, the amount or notes before sending or retrying
 *    (`PATCH /admin/disbursements/{id}`).
 *
 * @param {object} payout — `DisbursementResponse`
 */
export default function PayoutActions({ payout }) {
  const resolve = useResolveDisbursement();
  const sync = useSyncDisbursement();
  const update = useUpdateDisbursement();
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState(null); // 'send' | 'manual' | 'fail'
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  function open(next) {
    setMode(next);
    setReference('');
    setNotes('');
    resolve.reset();
  }

  const amount = formatCurrency(payout.amount ?? 0);
  const owner = payout.ownerName || payout.ownerEmail || 'the owner';
  const failed = payout.status === 'FAILED';
  const canAct = payout.status === 'PENDING' || failed;

  const canSubmit = mode === 'send' ? true : mode === 'manual' ? reference.trim() : notes.trim();
  const titles = { send: failed ? 'Try the payout again' : 'Send payout now', manual: 'Record a payout made by hand', fail: 'Mark payout as failed' };

  function submit() {
    const action = mode === 'fail' ? 'fail' : 'trigger';
    resolve.mutate(
      { id: payout.id, action, kind: mode, reference: mode === 'send' ? '' : reference.trim(), notes: notes.trim() },
      { onSuccess: () => setMode(null) }
    );
  }

  return (
    <>
      {payout.status === 'PROCESSING' && (
        <Button size="sm" variant="outline" loading={sync.isPending} onClick={() => sync.mutate(payout.id)}>
          {!sync.isPending && <RefreshCw size={14} aria-hidden="true" />} Check status
        </Button>
      )}
      {canAct && (
        <>
          <Button size="sm" onClick={() => open('send')}>
            {failed ? <RotateCcw size={14} aria-hidden="true" /> : <Send size={14} aria-hidden="true" />}
            {failed ? 'Try again' : 'Send payout now'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => open('manual')}>
            <CheckCircle2 size={14} aria-hidden="true" /> Already paid by hand
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil size={14} aria-hidden="true" /> Edit
          </Button>
          {!failed && (
            <Button size="sm" variant="danger" onClick={() => open('fail')}>
              <XCircle size={14} aria-hidden="true" /> Failed
            </Button>
          )}
        </>
      )}

      <PayoutFormModal
        isOpen={editing}
        onClose={() => setEditing(false)}
        title="Edit payout"
        submitLabel="Save changes"
        initial={{ amount: payout.amount, ownerPhone: payout.ownerPhone, notes: payout.notes }}
        mutation={update}
        intro={failed ? 'Correct what made it fail (often the phone number), then use Try again.' : undefined}
        onSubmit={(fields) => update.mutate({ id: payout.id, ...fields }, { onSuccess: () => setEditing(false) })}
      />

      <Modal isOpen={!!mode} onClose={() => setMode(null)} title={mode ? titles[mode] : ''}>
        {mode && (
          <div className="flex flex-col gap-4">
            {mode === 'send' ? (
              <p className="text-sm text-ink">
                Send <strong>{amount}</strong> to <strong>{owner}</strong> through the payment provider now? It shows as{' '}
                <strong>{PAYOUT_LABEL.PROCESSING}</strong> until the provider confirms it — use <strong>Check status</strong> to
                follow it. If you&apos;ve already paid them yourself, use <strong>Already paid by hand</strong> instead, so
                they aren&apos;t paid twice.
              </p>
            ) : (
              <p className="text-sm text-muted">
                {amount} to {owner}.
                {mode === 'manual' && ' Only for money you have already sent outside the system — nothing is sent from here.'}
              </p>
            )}
            {mode !== 'send' && (
              <Input
                label={mode === 'manual' ? 'Payment reference' : 'Reference (optional)'}
                hint={mode === 'manual' ? 'e.g. the M-Pesa or bank transfer code' : undefined}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            )}
            <Textarea
              label={mode === 'fail' ? 'What went wrong' : 'Notes (optional)'}
              name="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            {resolve.isError && <p role="alert" className="text-sm text-red-600">{apiErrorMessage(resolve.error, "Couldn't update the payout.")}</p>}
            <div className="flex flex-wrap gap-3 justify-end">
              <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
              <Button variant={mode === 'fail' ? 'danger' : 'default'} disabled={!canSubmit} loading={resolve.isPending} onClick={submit}>
                {mode === 'send' ? `Send ${amount}` : mode === 'manual' ? 'Record payment' : 'Mark failed'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
