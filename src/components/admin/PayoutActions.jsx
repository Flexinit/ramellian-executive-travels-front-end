import React, { useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Modal from '../ui/Modal';
import { useResolveDisbursement, useSyncDisbursement } from '../../hooks/useDisbursements';
import { apiErrorMessage } from '../../lib/apiError';
import { formatCurrency } from '../../lib/utils';

/**
 * What can be done with one owner payout, wherever it's shown (Owner Payouts, a booking's page): a payout **to pay**
 * is marked **paid** with the payment's reference (e.g. the M-Pesa code) or **failed** with what went wrong; a
 * **processing** one (sent, the payment provider hasn't confirmed it yet) can have its status checked. Paid and failed
 * ones have nothing left to do.
 *
 * @param {object} payout — `DisbursementResponse`
 */
export default function PayoutActions({ payout }) {
  const resolve = useResolveDisbursement();
  const sync = useSyncDisbursement();
  const [action, setAction] = useState(null); // 'trigger' | 'fail'
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  function open(next) {
    setAction(next);
    setReference('');
    setNotes('');
    resolve.reset();
  }

  const paying = action === 'trigger';
  const canSubmit = paying ? reference.trim() : notes.trim();

  return (
    <>
      {payout.status === 'PROCESSING' && (
        <Button size="sm" variant="outline" loading={sync.isPending} onClick={() => sync.mutate(payout.id)}>
          {!sync.isPending && <RefreshCw size={14} aria-hidden="true" />} Check status
        </Button>
      )}
      {payout.status === 'PENDING' && (
        <>
          <Button size="sm" onClick={() => open('trigger')}><CheckCircle2 size={14} aria-hidden="true" /> Mark paid</Button>
          <Button size="sm" variant="danger" onClick={() => open('fail')}><XCircle size={14} aria-hidden="true" /> Failed</Button>
        </>
      )}

      <Modal isOpen={!!action} onClose={() => setAction(null)} title={paying ? 'Mark payout as paid' : 'Mark payout as failed'}>
        {action && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              {formatCurrency(payout.amount ?? 0)} to {payout.ownerName || payout.ownerEmail}.
            </p>
            <Input
              label={paying ? 'Payment reference' : 'Reference (optional)'}
              hint={paying ? 'e.g. the M-Pesa or bank transfer code' : undefined}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
            <Textarea label={paying ? 'Notes (optional)' : 'What went wrong'} name="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            {resolve.isError && <p role="alert" className="text-sm text-red-600">{apiErrorMessage(resolve.error, "Couldn't update the payout.")}</p>}
            <div className="flex gap-3 justify-end">
              <Button onClick={() => setAction(null)}>Cancel</Button>
              <Button
                variant={paying ? 'default' : 'danger'}
                disabled={!canSubmit}
                loading={resolve.isPending}
                onClick={() => resolve.mutate({ id: payout.id, action, reference: reference.trim(), notes: notes.trim() }, { onSuccess: () => setAction(null) })}
              >
                {paying ? 'Mark paid' : 'Mark failed'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
