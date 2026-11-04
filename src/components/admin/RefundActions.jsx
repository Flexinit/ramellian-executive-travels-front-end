import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { useSettleRefund } from '../../hooks/useRefunds';
import { formatCurrency } from '../../lib/utils';

/**
 * Settling a refund by hand, for when Pesapal doesn't report back (`POST /admin/refunds/{id}/complete` / `.../fail`).
 * Only while it's still open (pending or processing); confirmed first, since it changes what the renter is told.
 *
 * @param {object} refund — `RefundResponse`
 */
export default function RefundActions({ refund }) {
  const settle = useSettleRefund();
  const [action, setAction] = useState(null); // 'complete' | 'fail'
  if (!['PENDING', 'PROCESSING'].includes(refund.status)) return null;
  const amount = formatCurrency(Math.round(Number(refund.amount) || 0));

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setAction('complete')}>
        <CheckCircle2 size={14} aria-hidden="true" /> Mark refunded
      </Button>
      <Button size="sm" variant="danger" onClick={() => setAction('fail')}>
        <XCircle size={14} aria-hidden="true" /> Mark failed
      </Button>
      <Modal isOpen={!!action} onClose={() => setAction(null)} title={action === 'complete' ? 'Mark refund as refunded' : 'Mark refund as failed'} size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink">
            {action === 'complete'
              ? <>Record the <strong>{amount}</strong> refund as done? Only once the money has actually reached the renter.</>
              : <>Record the <strong>{amount}</strong> refund as failed? You can start a new one afterwards.</>}
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={() => setAction(null)}>Cancel</Button>
            <Button
              variant={action === 'fail' ? 'danger' : 'default'}
              loading={settle.isPending}
              onClick={() => settle.mutate({ id: refund.id, action }, { onSuccess: () => setAction(null) })}
            >
              {action === 'complete' ? 'Mark refunded' : 'Mark failed'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
