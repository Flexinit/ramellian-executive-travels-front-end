import React from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import CircularCountdown from '../ui/CircularCountdown';
import { PAYOUT_WAIT_SECONDS, usePayoutNotice } from '../../hooks/usePayoutNotice';

const ICONS = {
  success: <CheckCircle2 size={40} className="text-green-600" aria-hidden="true" />,
  danger: <XCircle size={40} className="text-red-600" aria-hidden="true" />,
  warning: <Clock size={40} className="text-amber-600" aria-hidden="true" />,
  info: <Clock size={40} className="text-accent" aria-hidden="true" />,
};

/**
 * The big 60-second countdown right after **Send payout now** / **Try again**, then the result. It only shows what
 * `usePayoutNotice` holds — the waiting itself is run by the page's `PayoutNotice` banner, which keeps the countdown
 * (smaller) and the result on screen after this is closed. Closing it doesn't stop the payout.
 *
 * @param {boolean} isOpen @param {function} onClose
 */
export default function PayoutSendProgress({ isOpen, onClose }) {
  const [notice] = usePayoutNotice();
  if (!isOpen || !notice) return null;
  const { watch } = notice;
  const waiting = !!watch;

  return (
    <Modal isOpen onClose={onClose} title={waiting ? 'Waiting for Safaricom' : notice.title} size="sm">
      <div className="flex flex-col items-center gap-4 text-center" aria-live="polite">
        {notice.about && <p className="text-sm font-semibold text-ink">{notice.about}</p>}
        {waiting && !watch.checking && (
          <CircularCountdown startedAt={watch.startedAt} durationSeconds={PAYOUT_WAIT_SECONDS} label="left for Safaricom to confirm the payout" />
        )}
        {waiting && watch.checking && <Spinner />}
        {!waiting && ICONS[notice.tone]}
        <p className="text-sm text-ink">{waiting && watch.checking ? 'Checking with Safaricom one last time…' : notice.message}</p>
        {waiting && <p className="text-xs text-muted">You can close this. The countdown stays at the top of the page, and the payout carries on.</p>}
        <Button variant={waiting ? 'outline' : 'default'} onClick={onClose}>{waiting ? 'Close' : 'Done'}</Button>
      </div>
    </Modal>
  );
}
