import React from 'react';
import NoticeBanner from '../ui/NoticeBanner';
import CircularCountdown from '../ui/CircularCountdown';
import { PAYOUT_WAIT_SECONDS, usePayoutNotice } from '../../hooks/usePayoutNotice';
import { formatTime } from '../../lib/utils';

/**
 * The last payout result (`usePayoutNotice`) as a banner that stays until dismissed. While payouts just sent are
 * waiting for Safaricom it shows the 60-second countdown, and it runs that wait — so mount it once per page. On a
 * booking's page pass its `bookingId`, so only that booking's payout news shows there.
 *
 * @param {string} [bookingId]
 */
export default function PayoutNotice({ bookingId }) {
  const [notice, dismiss] = usePayoutNotice({ run: true });
  if (!notice) return null;
  if (bookingId && notice.bookingId !== bookingId) return null;
  const { watch } = notice;
  return (
    <NoticeBanner
      tone={notice.tone}
      title={watch?.checking ? 'Checking with Safaricom one last time…' : notice.title}
      meta={[notice.about, `${watch ? 'sent' : ''} at ${formatTime(notice.at)}`.trim()].filter(Boolean).join(' · ')}
      aside={watch && !watch.checking ? (
        <CircularCountdown size="sm" startedAt={watch.startedAt} durationSeconds={PAYOUT_WAIT_SECONDS} label="left for Safaricom to confirm" />
      ) : null}
      onDismiss={watch ? undefined : dismiss}
    >
      {notice.message}
    </NoticeBanner>
  );
}
