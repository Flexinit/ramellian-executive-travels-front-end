import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import { PAYOUT_LABEL, useBatchResolveDisbursements } from '../../hooks/useDisbursements';
import { formatCurrency } from '../../lib/utils';

/**
 * Batch payouts (product owner, 2026-10-27): the payouts ticked on Owner Payouts, all at once — **Send** them through
 * the payment provider, or record them as **already paid by hand** with one reference (a bulk bank transfer). Confirmed
 * first with the count and total, since it moves money; then progress, then what went through and what didn't (with
 * the backend's reason), so a failed one can be fixed and retried on its own.
 *
 * @param {'send'|'manual'|null} kind — which batch action; `null` closes it
 * @param {object[]} payouts — the selected `DisbursementResponse`s
 * @param {function} onClose
 * @param {function} onFinished — the batch ran (clear the selection)
 */
export default function BatchPayoutModal({ kind, payouts: selected, onClose, onFinished }) {
  const batch = useBatchResolveDisbursements();
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  // The batch as it was when it ran: the page clears its selection once it has, but the result still names them.
  const [ran, setRan] = useState(null);
  const payouts = ran || selected;

  useEffect(() => {
    if (!kind) return;
    setReference('');
    setNotes('');
    setProgress(0);
    setResult(null);
    setRan(null);
    batch.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const count = payouts.length;
  const total = formatCurrency(payouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
  const noun = count === 1 ? 'payout' : 'payouts';
  const running = batch.isPending;

  function run() {
    setRan(selected);
    batch.mutate(
      { payouts, kind, reference: reference.trim(), notes: notes.trim(), onProgress: setProgress },
      {
        onSuccess: (outcome) => {
          setResult(outcome);
          onFinished?.();
        },
      }
    );
  }

  const title = kind === 'manual' ? `Record ${count} ${noun} paid by hand` : `Send ${count} ${noun}`;

  return (
    <Modal isOpen={!!kind} onClose={running ? () => {} : onClose} title={title}>
      {result ? (
        <div className="flex flex-col gap-4">
          {result.done.length > 0 && (
            <p className="text-sm text-ink inline-flex items-start gap-2">
              <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                {kind === 'manual'
                  ? `${result.done.length} recorded as paid.`
                  : `${result.done.length} sent${result.done.some((d) => d.updated?.status === 'PROCESSING') ? ` — they show as ${PAYOUT_LABEL.PROCESSING} until the provider confirms them` : ''}.`}
              </span>
            </p>
          )}
          {result.failed.length > 0 && (
            <div role="alert" className="flex flex-col gap-2">
              <p className="text-sm text-red-600 inline-flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
                {result.failed.length} didn&apos;t go through and {result.failed.length === 1 ? 'is' : 'are'} unchanged — fix and retry:
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {result.failed.map(({ payout, message }) => (
                  <li key={payout.id} className="rounded-tile border border-line px-3 py-2">
                    <span className="text-ink font-medium">{payout.ownerName || payout.ownerEmail || 'Owner'}</span>
                    <span className="text-muted"> · {formatCurrency(payout.amount ?? 0)} · {message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink">
            {kind === 'manual' ? (
              <>Record <strong>{count} {noun}</strong> totalling <strong>{total}</strong> as already paid? Only for money you have already sent outside the system — nothing is sent from here.</>
            ) : (
              <>Send <strong>{count} {noun}</strong> totalling <strong>{total}</strong> through the payment provider now? Each shows as <strong>{PAYOUT_LABEL.PROCESSING}</strong> until the provider confirms it.</>
            )}
          </p>
          <ul className="flex flex-col divide-y divide-line rounded-tile border border-line max-h-48 overflow-y-auto text-sm" aria-label="Selected payouts">
            {payouts.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 px-3 py-2">
                <span className="text-ink truncate">{p.ownerName || p.ownerEmail || 'Owner'}{p.vehicleTitle ? <span className="text-muted"> · {p.vehicleTitle}</span> : null}</span>
                <span className="text-ink font-medium tabular-nums shrink-0">{formatCurrency(p.amount ?? 0)}</span>
              </li>
            ))}
          </ul>
          {kind === 'manual' && (
            <Input
              label="Payment reference"
              hint="The same reference is saved on each, e.g. the bank's bulk transfer code"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={running}
            />
          )}
          <Textarea label="Notes (optional)" name="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={running} />
          {running && (
            <p className="text-sm text-muted" aria-live="polite">
              {kind === 'manual' ? 'Recording' : 'Sending'} {Math.min(progress + 1, count)} of {count}…
            </p>
          )}
          <div className="flex flex-wrap gap-3 justify-end">
            <Button variant="outline" onClick={onClose} disabled={running}>Cancel</Button>
            <Button disabled={kind === 'manual' && !reference.trim()} loading={running} onClick={run}>
              {kind === 'manual' ? `Record ${count} paid` : `Send ${total}`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
