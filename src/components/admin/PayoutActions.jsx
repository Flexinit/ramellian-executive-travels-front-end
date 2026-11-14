import React, { useState } from 'react';
import { CheckCircle2, Pencil, PencilLine, RefreshCw, RotateCcw, Search, Send, XCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import {
  PAYOUT_LABEL,
  useOverrideDisbursementStatus,
  useQueryDisbursementStatus,
  useResolveDisbursement,
  useSyncDisbursement,
  useUpdateDisbursement,
} from '../../hooks/useDisbursements';
import PayoutFormModal from './PayoutFormModal';
import PayoutSendProgress from './PayoutSendProgress';
import { apiErrorMessage } from '../../lib/apiError';
import { formatCurrency } from '../../lib/utils';

const STATUS_OPTIONS = [
  { value: 'COMPLETED', label: `${PAYOUT_LABEL.COMPLETED} (the owner received it)` },
  { value: 'FAILED', label: PAYOUT_LABEL.FAILED },
  { value: 'PENDING', label: `${PAYOUT_LABEL.PENDING} (send it again)` },
];

// An M-Pesa confirmation code: letters and digits (10 today; allow a little room either side).
const RECEIPT = /^[A-Z0-9]{8,20}$/;

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
 *  - **Ask Safaricom** (processing or failed): asks Safaricom what really happened (`.../query-status`) — for a payout
 *    stuck as Processing, and before **Try again**, so an owner isn't paid twice.
 *  - **Set status** (processing or failed): sets it outright (`PATCH .../status`), for when Safaricom can't be
 *    reached. Marking it **Paid** needs the M-Pesa confirmation code, so a payout is never marked paid without proof.
 *
 * After **Send payout now** / **Try again**, a 60-second countdown waits for Safaricom to confirm it
 * (`PayoutSendProgress`). A list whose row disappears once the payout is sent (Owner Payouts) passes `onSent` and shows
 * the countdown itself; otherwise it's shown here.
 *
 * @param {object} payout — `DisbursementResponse`
 * @param {function} [onSent] — called once a payout has been sent through the provider
 */
export default function PayoutActions({ payout, onSent }) {
  const resolve = useResolveDisbursement();
  const sync = useSyncDisbursement();
  const update = useUpdateDisbursement();
  const query = useQueryDisbursementStatus();
  const override = useOverrideDisbursementStatus();
  const [setting, setSetting] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [receipt, setReceipt] = useState('');
  const [statusError, setStatusError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
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
  // Stuck or failed: worth asking Safaricom, or setting by hand once the admin has checked the M-Pesa statement.
  const canInvestigate = payout.status === 'PROCESSING' || failed;
  const statusOptions = STATUS_OPTIONS.filter((o) => o.value !== payout.status);

  function startSetting() {
    setNextStatus('');
    setReceipt('');
    setStatusError(null);
    override.reset();
    setSetting(true);
  }

  const receiptCode = receipt.trim().toUpperCase();
  const receiptInvalid = nextStatus === 'COMPLETED' && receiptCode !== '' && !RECEIPT.test(receiptCode);
  const canSaveStatus = !!nextStatus && (nextStatus !== 'COMPLETED' || RECEIPT.test(receiptCode));

  function saveStatus() {
    if (!nextStatus) return setStatusError('Choose a status.');
    if (!canSaveStatus) return undefined;
    override.mutate(
      { id: payout.id, status: nextStatus, receipt: nextStatus === 'COMPLETED' ? receiptCode : undefined },
      { onSuccess: () => setSetting(false) }
    );
  }

  const canSubmit = mode === 'send' ? true : mode === 'manual' ? reference.trim() : notes.trim();
  const titles = { send: failed ? 'Try the payout again' : 'Send payout now', manual: 'Record a payout made by hand', fail: 'Mark payout as failed' };

  function submit() {
    const action = mode === 'fail' ? 'fail' : 'trigger';
    resolve.mutate(
      { id: payout.id, payout, action, kind: mode, reference: mode === 'send' ? '' : reference.trim(), notes: notes.trim() },
      {
        onSuccess: () => {
          setMode(null);
          if (mode !== 'send') return;
          if (onSent) onSent();
          else setShowProgress(true);
        },
      }
    );
  }

  return (
    <>
      {payout.status === 'PROCESSING' && (
        <Button size="sm" variant="outline" loading={sync.isPending} onClick={() => sync.mutate(payout.id)}>
          {!sync.isPending && <RefreshCw size={14} aria-hidden="true" />} Check status
        </Button>
      )}
      {canInvestigate && (
        <>
          <Button size="sm" variant="outline" loading={query.isPending} disabled={query.isPending} onClick={() => query.mutate(payout.id)}>
            {!query.isPending && <Search size={14} aria-hidden="true" />} Ask Safaricom
          </Button>
          <Button size="sm" variant="outline" onClick={startSetting}>
            <PencilLine size={14} aria-hidden="true" /> Set status
          </Button>
        </>
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

      {!onSent && <PayoutSendProgress isOpen={showProgress} onClose={() => setShowProgress(false)} />}

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
            {mode === 'send' && failed && (
              <p role="note" className="rounded-tile border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
                A payout can show as failed even though the money arrived. Use <strong>Ask Safaricom</strong> first, or
                check with {owner}, so they aren&apos;t paid twice.
              </p>
            )}
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

      <Modal isOpen={setting} onClose={() => setSetting(false)} title="Set payout status">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink">
            {amount} to {owner}, now <strong>{(PAYOUT_LABEL[payout.status] || payout.status).toLowerCase()}</strong>. Only
            when Safaricom can&apos;t be reached and you&apos;ve checked the M-Pesa statement yourself. Try{' '}
            <strong>Ask Safaricom</strong> first. Nothing is sent from here.
          </p>
          <Select
            label="New status"
            placeholder="Choose a status"
            options={statusOptions}
            value={nextStatus}
            onChange={(e) => { setNextStatus(e.target.value); setStatusError(null); }}
            error={statusError}
          />
          {nextStatus === 'COMPLETED' && (
            <Input
              label="M-Pesa confirmation code"
              hint="From the M-Pesa statement for this payout, e.g. SGH7XK2ABC. Required."
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
              error={receiptInvalid ? 'Letters and numbers only, 8 to 20 characters.' : undefined}
              autoComplete="off"
              maxLength={20}
            />
          )}
          {nextStatus === 'PENDING' && (
            <p className="text-sm text-muted">It goes back to To pay, ready to send or record as paid by hand.</p>
          )}
          {override.isError && <p role="alert" className="text-sm text-red-600">{apiErrorMessage(override.error, "Couldn't set the payout's status.")}</p>}
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" onClick={() => setSetting(false)}>Cancel</Button>
            <Button
              variant={nextStatus === 'FAILED' ? 'danger' : 'default'}
              disabled={!canSaveStatus}
              loading={override.isPending}
              onClick={saveStatus}
            >
              Save status
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
