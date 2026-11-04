import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, RotateCcw, Smartphone } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { contributionConfirming, contributionPaid, splitIsClosed, splitIsPaid } from '../../hooks/useSplitPayment';
import { formatCurrency } from '../../lib/utils';

const money = (n) => formatCurrency(Math.round(Number(n) || 0));

function contributionBadge(c, closed) {
  if (contributionPaid(c)) return { label: 'Paid', variant: 'success' };
  if (contributionConfirming(c)) return { label: 'Confirming', variant: 'info' };
  if (c.status === 'FAILED') return { label: 'Not paid', variant: 'danger' };
  if (closed) return { label: 'Not paid', variant: 'neutral' };
  return { label: 'Waiting', variant: 'warning' };
}

/** "42 min left" / "1 h 5 min left" — ticking every 30 s; null once past. */
function useTimeLeft(expiresAt) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now;
  if (!(ms > 0)) return null;
  const mins = Math.ceil(ms / 60_000);
  return mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min left` : `${mins} min left`;
}

/**
 * A split payment as it happens (`SplitPaymentResponse`, refreshed every few seconds by `useSplitPayment`): how much
 * of the total is in, the time left, and each person — their share and whether they've paid, with **Resend prompt**
 * for anyone who hasn't. Once everyone has paid the page moves on by itself (PaymentPage); if time runs out first, it
 * says so and offers to start again.
 *
 * @param {object} split — `SplitPaymentResponse`
 * @param {(contributionId: string) => void} onResend
 * @param {string|null} [resendingId]
 * @param {string} [yourPhone] — the renter's own number, to mark their row "You"
 * @param {function} [onStartAgain] — after it expired or failed: a new split
 * @param {function} [onPayAnotherWay]
 */
export default function SplitPaymentProgress({ split, onResend, resendingId, yourPhone, onStartAgain, onPayAnotherWay }) {
  const total = Number(split.totalAmount) || 0;
  const paid = Number(split.totalPaid) || 0;
  const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const closed = splitIsClosed(split);
  const fullyPaid = splitIsPaid(split);
  const timeLeft = useTimeLeft(split.expiresAt);
  const contributions = Array.isArray(split.contributions) ? split.contributions : [];
  const paidCount = contributions.filter(contributionPaid).length;
  const digits = (p) => String(p || '').replace(/\D/g, '').slice(-9);

  return (
    <section className="flex flex-col gap-4" aria-label="Split payment">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-ink font-semibold">
            {fullyPaid
              ? 'Everyone has paid'
              : closed
                ? 'This split payment has ended'
                : split.groupStatus === 'PARTIAL' || paidCount > 0 ? 'Waiting for the rest to pay' : 'Waiting for everyone to pay'}
          </p>
          {!closed && timeLeft && (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Clock size={12} aria-hidden="true" /> {timeLeft}
            </span>
          )}
        </div>
        <div
          className="h-2.5 w-full rounded-full bg-ink/10 overflow-hidden"
          role="progressbar"
          aria-label="Paid so far"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${money(paid)} of ${money(total)} paid`}
        >
          <div className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none bg-mpesa`} style={{ width: `${percent}%` }} />
        </div>
        <p className="text-sm text-muted">
          <strong className="text-ink tabular-nums">{money(paid)}</strong> of <span className="tabular-nums">{money(total)}</span> paid
          {' · '}{paidCount} of {contributions.length} people
          {!fullyPaid && Number(split.totalOutstanding) > 0 && <> · <span className="tabular-nums">{money(split.totalOutstanding)}</span> to go</>}
        </p>
      </div>

      <ul className="flex flex-col divide-y divide-line rounded-tile border border-line" aria-label="Who pays">
        {contributions.map((c) => {
          const badge = contributionBadge(c, closed);
          const isYou = yourPhone && digits(c.payerPhone) === digits(yourPhone);
          const done = contributionPaid(c);
          return (
            <li key={c.contributionId} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
              <div className="min-w-0 flex items-center gap-3">
                <span className={`w-8 h-8 shrink-0 rounded-full inline-flex items-center justify-center ${done ? 'bg-mpesa/15 text-mpesa-deep' : 'bg-ink/5 text-muted'}`} aria-hidden="true">
                  {done ? <CheckCircle2 size={16} /> : <Smartphone size={16} />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-ink font-medium truncate">
                    {c.payerName || c.payerPhone}{isYou && <span className="text-muted font-normal"> (you)</span>}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {c.payerName && c.payerPhone}{c.receipt && ` · M-Pesa ${c.receipt}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink tabular-nums">{money(c.amount)}</span>
                <Badge label={badge.label} variant={badge.variant} />
                {!done && !closed && !contributionConfirming(c) && (
                  <Button size="sm" variant="outline" loading={resendingId === c.contributionId} onClick={() => onResend(c.contributionId)}>
                    {resendingId !== c.contributionId && <RotateCcw size={14} aria-hidden="true" />} Resend prompt
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!closed && (
        <p className="text-xs text-muted">
          Each person gets an M-Pesa prompt on their phone and enters their PIN. Didn&apos;t get it? Resend it. This page
          updates by itself.
        </p>
      )}

      {closed && !fullyPaid && (
        <div role="alert" className="flex flex-col gap-3 rounded-tile bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-ink inline-flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            Not everyone paid in time, so the booking isn&apos;t paid yet. Start the split again, or pay another way.
            {paid > 0 && ' Anything already paid is handled by our team — contact support if it isn\'t refunded.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {onStartAgain && <Button size="sm" onClick={onStartAgain}>Start again</Button>}
            {onPayAnotherWay && <Button size="sm" variant="outline" onClick={onPayAnotherWay}>Pay another way</Button>}
          </div>
        </div>
      )}
    </section>
  );
}
