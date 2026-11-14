import { useEffect, useRef } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../lib/api';
import { formatCurrency } from '../lib/utils';

/**
 * The last thing that happened to owner payouts — sent, paid, failed, what Safaricom said — kept on screen as a banner
 * (`PayoutNotice`) until the admin dismisses it or the next result replaces it, instead of a toast that fades (product
 * owner, 2026-11-14). Held in the React Query cache, so it survives the payout's row leaving the list and moving between
 * Owner Payouts and a booking's page.
 *
 * A notice: `{ tone: 'success'|'danger'|'warning'|'info', title, message?, about?, payoutId?, bookingId?, at, watch? }`.
 *
 * **Waiting for Safaricom.** Right after payouts are sent (one, or a batch), the notice carries a `watch`: a visible
 * 60-second countdown during which the payouts are re-read every 5 seconds (read-only, nothing is sent again). As the
 * minute runs out, any still unconfirmed are checked once more (`POST .../sync`). The notice then becomes the result:
 * paid, failed, or still processing.
 */
const NOTICE_KEY = ['payout-notice'];
const DISBURSEMENTS_KEY = ['admin', 'disbursements'];

export const PAYOUT_WAIT_SECONDS = 60;
const POLL_MS = 5000;
const FINAL = ['COMPLETED', 'FAILED'];

/** The banner tone for a payout status. */
export const toneFor = (status) => (status === 'COMPLETED' ? 'success' : status === 'FAILED' ? 'danger' : status === 'PROCESSING' ? 'warning' : 'info');

function aboutPayouts(payouts) {
  if (payouts.length !== 1) {
    const total = payouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return `${payouts.length} payouts · ${formatCurrency(total)}`;
  }
  const p = payouts[0];
  const who = p.ownerName || p.ownerEmail;
  const about = [p.amount != null ? formatCurrency(p.amount) : null, who ? `to ${who}` : null].filter(Boolean).join(' ');
  return [about, p.vehicleTitle].filter(Boolean).join(' · ') || null;
}

/** Shows a payout result until dismissed or replaced. `payout` (a `DisbursementResponse`) says which one it's about. */
export function postPayoutNotice(queryClient, { payout, payouts, ...notice }) {
  queryClient.setQueryDefaults(NOTICE_KEY, { staleTime: Infinity, gcTime: Infinity });
  const list = payouts || (payout ? [payout] : []);
  queryClient.setQueryData(NOTICE_KEY, {
    ...notice,
    about: list.length ? aboutPayouts(list) : null,
    payoutId: list.length === 1 ? list[0].id : null,
    bookingId: list.length === 1 ? list[0].bookingId || null : null,
    at: Date.now(),
  });
}

/**
 * Starts the 60-second wait for payouts just sent (each as `trigger` returned it). Ones already settled are reported
 * straight away.
 */
export function startPayoutWatch(queryClient, payouts) {
  const list = payouts.filter(Boolean);
  if (!list.length) return;
  if (list.every((p) => FINAL.includes(p.status))) return finishWatch(queryClient, list, false);
  postPayoutNotice(queryClient, {
    payouts: list,
    tone: 'warning',
    title: 'Waiting for Safaricom',
    message: list.length === 1
      ? "The payout has been sent. Waiting for Safaricom to confirm it. Don't send it again."
      : `${list.length} payouts have been sent. Waiting for Safaricom to confirm them. Don't send them again.`,
    watch: { startedAt: Date.now(), payouts: list },
  });
}

function finishWatch(queryClient, payouts, timedOut) {
  queryClient.invalidateQueries({ queryKey: DISBURSEMENTS_KEY });
  const paid = payouts.filter((p) => p.status === 'COMPLETED');
  const failed = payouts.filter((p) => p.status === 'FAILED');
  const open = payouts.filter((p) => !FINAL.includes(p.status));
  const later = 'Use Check status or Ask Safaricom on the Processing tab in a few minutes. Don\'t send it again; the owner could be paid twice.';

  if (payouts.length === 1) {
    const p = payouts[0];
    if (p.status === 'COMPLETED') {
      return postPayoutNotice(queryClient, { payout: p, tone: 'success', title: 'Payout paid', message: `The owner has received it.${p.reference ? ` M-Pesa ref ${p.reference}.` : ''}` });
    }
    if (p.status === 'FAILED') {
      return postPayoutNotice(queryClient, { payout: p, tone: 'danger', title: 'Payout failed', message: `${p.notes ? `${p.notes} ` : ''}It's under Failed: check the owner's phone with Edit, then Try again.` });
    }
    return postPayoutNotice(queryClient, {
      payout: p, tone: 'warning', title: 'Still processing',
      message: `${timedOut ? "Safaricom hasn't confirmed it within a minute. " : ''}${later}`,
    });
  }

  const parts = [paid.length && `${paid.length} paid`, failed.length && `${failed.length} failed`, open.length && `${open.length} still processing`].filter(Boolean);
  return postPayoutNotice(queryClient, {
    payouts,
    tone: failed.length ? 'danger' : open.length ? 'warning' : 'success',
    title: parts.join(', '),
    message: [
      failed.length ? `Failed: ${failed.map((p) => p.ownerName || p.ownerEmail || 'owner').join(', ')}. Check their phones with Edit, then Try again.` : '',
      open.length ? `${timedOut ? "Not confirmed within a minute. " : ''}${later}` : '',
    ].filter(Boolean).join(' ') || 'Every owner has received their payout.',
  });
}

async function fetchBookingPayout(bookingId) {
  try {
    return await apiGet(`/admin/disbursements/bookings/${bookingId}`);
  } catch (error) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

/**
 * `[notice, dismiss]` — the current payout notice (or null) and a way to clear it. With `{ run: true }` (one per page —
 * `PayoutNotice` does it) it also runs the 60-second wait: the 5-second re-reads, the last check, the result.
 */
export function usePayoutNotice({ run = false } = {}) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: NOTICE_KEY, queryFn: () => null, enabled: false, staleTime: Infinity, gcTime: Infinity });
  const notice = data || null;
  const watch = run ? notice?.watch : null;
  const startedAt = watch?.startedAt;
  const finishing = useRef(null);

  const reads = useQueries({
    queries: (watch?.payouts || []).map((p) => ({
      queryKey: [...DISBURSEMENTS_KEY, 'booking', p.bookingId],
      queryFn: () => fetchBookingPayout(p.bookingId),
      enabled: !!p.bookingId && !watch.checking,
      refetchInterval: POLL_MS,
      retry: false,
    })),
  });

  // The freshest status of each payout being waited on.
  const latest = (watch?.payouts || []).map((p, i) => (reads[i]?.data?.id === p.id ? { ...p, ...reads[i].data } : p));
  const allSettled = !!watch && latest.every((p) => FINAL.includes(p.status));
  const signature = latest.map((p) => p.status).join(',');

  function stillCurrent() {
    return queryClient.getQueryData(NOTICE_KEY)?.watch?.startedAt === startedAt;
  }

  // Settled before the minute is up: say so at once.
  useEffect(() => {
    if (!allSettled || finishing.current === startedAt || !stillCurrent()) return;
    finishing.current = startedAt;
    finishWatch(queryClient, latest, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSettled, signature, startedAt]);

  // The minute is up: check the rest once more, then report.
  useEffect(() => {
    if (!startedAt || watch.checking) return undefined;
    const left = startedAt + PAYOUT_WAIT_SECONDS * 1000 - Date.now();
    const id = setTimeout(async () => {
      if (finishing.current === startedAt || !stillCurrent()) return;
      finishing.current = startedAt;
      queryClient.setQueryData(NOTICE_KEY, (n) => (n?.watch ? { ...n, watch: { ...n.watch, checking: true } } : n));
      const checked = [];
      for (const p of latest) {
        if (FINAL.includes(p.status)) { checked.push(p); continue; }
        try {
          checked.push({ ...p, ...(await apiPost(`/admin/disbursements/${p.id}/sync`)) });
        } catch {
          checked.push(p);
        }
      }
      if (queryClient.getQueryData(NOTICE_KEY)?.watch?.startedAt === startedAt) finishWatch(queryClient, checked, true);
    }, Math.max(0, left));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, watch?.checking, signature]);

  return [notice, () => queryClient.setQueryData(NOTICE_KEY, null)];
}
