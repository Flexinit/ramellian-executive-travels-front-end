import React from 'react';
import { Link } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import { PAYOUT_LABEL, PAYOUT_VARIANT, useMyDisbursements } from '../../hooks/useDisbursements';
import { formatCurrency, formatDate } from '../../lib/utils';

/** What each status means to the owner (the admin's "To pay" is "on its way" from their side). */
const OWNER_LABEL = { PENDING: 'Being prepared', PROCESSING: 'On its way', COMPLETED: 'Paid', FAILED: 'Delayed' };

/**
 * The owner's own payouts — `GET /owner/disbursements` (live spec 2026-10-26): each booking's payout with where it
 * stands, so they can see what's been paid and what's on its way without asking. Its own request: if it fails or is
 * refused, only this card says so — the statement below still shows.
 */
export default function OwnerPayoutsCard() {
  const { data, isLoading, isError } = useMyDisbursements();
  const list = (Array.isArray(data) ? data : []).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const owed = list.filter((d) => d.status !== 'COMPLETED').reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  return (
    <Card className="p-5 flex flex-col gap-4 print:hidden" aria-label="Your payouts">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-ink text-base font-semibold inline-flex items-center gap-2">
            <Wallet size={16} className="text-accent" aria-hidden="true" />
            Your payouts
          </h2>
          <p className="text-muted text-sm mt-1">Money paid to you for each booking, and what&apos;s still on its way.</p>
        </div>
        {owed > 0 && (
          <p className="text-sm text-muted">
            On its way: <span className="text-ink font-semibold tabular-nums">{formatCurrency(owed)}</span>
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner label="Loading your payouts" /></div>
      ) : isError ? (
        <p className="text-sm text-muted">Your payouts can&apos;t be shown right now.</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted">No payouts yet. A booking&apos;s payout appears here once the renter has collected the vehicle.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {list.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
              <div className="min-w-0 flex flex-col">
                <span className="text-sm font-semibold text-ink">{d.vehicleTitle || 'Booking'}</span>
                <span className="text-xs text-muted">
                  {d.triggeredAt ? `${d.status === 'COMPLETED' ? 'Paid' : 'Sent'} ${formatDate(d.triggeredAt)}` : d.createdAt ? `Since ${formatDate(d.createdAt)}` : ''}
                  {d.reference ? ` · ref ${d.reference}` : ''}
                  {d.bookingId && (
                    <>
                      {' · '}
                      <Link to={`/owner/bookings/${d.bookingId}`} className="text-accent hover:underline focus-ring rounded">Booking</Link>
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge label={OWNER_LABEL[d.status] || PAYOUT_LABEL[d.status] || d.status} variant={PAYOUT_VARIANT[d.status] || 'neutral'} />
                <span className="text-sm font-bold text-ink tabular-nums">{formatCurrency(d.amount ?? 0)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
