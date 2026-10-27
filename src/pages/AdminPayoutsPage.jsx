import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Plus, Send } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import SegmentedControl from '../components/ui/SegmentedControl';
import Button from '../components/ui/Button';
import Checkbox from '../components/ui/Checkbox';
import PayoutActions from '../components/admin/PayoutActions';
import CreatePayoutModal from '../components/admin/CreatePayoutModal';
import BatchPayoutModal from '../components/admin/BatchPayoutModal';
import { PAYOUT_LABEL, PAYOUT_VARIANT, useDisbursements } from '../hooks/useDisbursements';
import { apiErrorMessage } from '../lib/apiError';
import { formatCurrency, formatDateTime } from '../lib/utils';

/**
 * Owner payouts (see hooks/useDisbursements.js): each booking's payout to its owner, by status. A payout is created
 * by the backend when the vehicle's pickup is recorded — not when the booking is paid — so a paid booking whose
 * pickup hasn't been recorded has nothing here yet; the empty state says so, and each booking's own page shows its
 * payout (or why there isn't one). Since 2026-10-26 a payout can also be **PROCESSING** (sent, not yet confirmed by
 * the payment provider), with **Check status** to ask for the latest. **Create payout** (header) makes one by hand for a
 * paid booking that has none, picking the booking here (`CreatePayoutModal`). On **To pay** and **Failed**, payouts can be
 * ticked and sent — or recorded as paid by hand — together (`BatchPayoutModal`, 2026-10-27).
 */
const BATCH_STATUSES = ['PENDING', 'FAILED'];

const STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];

export default function AdminPayoutsPage() {
  const [status, setStatus] = useState('PENDING');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [batchKind, setBatchKind] = useState(null);
  const { data, isLoading, isError, error, refetch } = useDisbursements(status);
  const list = Array.isArray(data) ? data : [];
  const canBatch = BATCH_STATUSES.includes(status);

  // A selection belongs to one tab, and only to payouts still listed there.
  useEffect(() => {
    setSelected(new Set());
  }, [status]);
  const chosen = list.filter((d) => selected.has(d.id));
  const allChosen = list.length > 0 && chosen.length === list.length;

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <PageWrapper className="max-w-6xl">
      <PageTitle title="Owner Payouts" />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Owner Payouts</h1>
            <p className="text-muted text-sm mt-1.5">
              What each owner is owed for a booking. Mark it paid once the money is sent, with its reference. A payout
              that's <strong className="text-ink font-medium">Processing</strong> has been sent and is waiting for the payment
              provider — <strong className="text-ink font-medium">Check status</strong> asks for the latest.
            </p>
          </div>
          <Button size="sm" className="self-start shrink-0" onClick={() => setCreating(true)}>
            <Plus size={14} aria-hidden="true" /> Create payout
          </Button>
        </div>
        <CreatePayoutModal isOpen={creating} onClose={() => setCreating(false)} />
        <BatchPayoutModal kind={batchKind} payouts={chosen} onClose={() => setBatchKind(null)} onFinished={() => setSelected(new Set())} />

        <SegmentedControl
          label="Payout status"
          options={STATUSES.map((s) => ({ value: s, label: PAYOUT_LABEL[s] }))}
          value={status}
          onChange={setStatus}
          className="self-start"
        />

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" label="Loading payouts" /></div>
        ) : isError ? (
          <ErrorBanner message={apiErrorMessage(error, 'Could not load the payouts.')} onRetry={refetch} />
        ) : list.length === 0 ? (
          <EmptyState
            title={`No payouts ${PAYOUT_LABEL[status].toLowerCase()}`}
            description={
              status === 'PENDING'
                ? "A booking's payout appears here once the vehicle's pickup has been recorded on the booking (Handover) — not as soon as it's paid. If the automatic one never happened, use Create payout above."
                : 'Payouts appear here once they reach this stage.'
            }
            action={status === 'PENDING' ? { label: 'Create payout', onClick: () => setCreating(true) } : undefined}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {canBatch && (
              <Card className="p-3 flex flex-wrap items-center justify-between gap-3" aria-label="Batch payouts">
                <Checkbox
                  checked={allChosen}
                  onChange={() => setSelected(allChosen ? new Set() : new Set(list.map((d) => d.id)))}
                  label={chosen.length
                    ? <span className="text-ink"><strong>{chosen.length}</strong> selected · <strong className="tabular-nums">{formatCurrency(chosen.reduce((sum, d) => sum + (Number(d.amount) || 0), 0))}</strong> <span className="sr-only">(select all)</span></span>
                    : <span className="text-ink">Select all</span>}
                />
                {chosen.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setBatchKind('send')}>
                      <Send size={14} aria-hidden="true" /> Send {chosen.length}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setBatchKind('manual')}>
                      <CheckCircle2 size={14} aria-hidden="true" /> Mark {chosen.length} paid by hand
                    </Button>
                  </div>
                )}
              </Card>
            )}
            {list.map((d) => (
              <Card key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex items-start gap-3">
                {canBatch && (
                  <Checkbox
                    className="mt-0.5"
                    checked={selected.has(d.id)}
                    onChange={() => toggle(d.id)}
                    label={<span className="sr-only">Select the payout to {d.ownerName || d.ownerEmail || 'the owner'}</span>}
                  />
                )}
                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-ink font-semibold">{d.vehicleTitle || 'Vehicle'}</span>
                    <Badge label={PAYOUT_LABEL[d.status] || d.status} variant={PAYOUT_VARIANT[d.status] || 'neutral'} />
                  </div>
                  <p className="text-sm text-muted">
                    To {d.ownerName || d.ownerEmail}{d.ownerName && d.ownerEmail ? ` (${d.ownerEmail})` : ''}{d.ownerPhone ? ` · ${d.ownerPhone}` : ''}
                  </p>
                  <p className="text-xs text-muted">
                    {d.bookingId && <Link to={`/admin/bookings/${d.bookingId}`} className="text-accent hover:underline focus-ring rounded">Booking</Link>}
                    {d.createdAt && ` · created ${formatDateTime(d.createdAt)}`}
                    {d.triggeredAt && ` · ${d.status === 'FAILED' ? 'failed' : d.status === 'PROCESSING' ? 'sent' : 'paid'} ${formatDateTime(d.triggeredAt)}${d.triggeredBy ? ` by ${d.triggeredBy}` : ''}`}
                    {d.reference && ` · ref ${d.reference}`}
                  </p>
                  {d.notes && <p className="text-xs text-muted italic">{d.notes}</p>}
                </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <span className="text-lg font-bold text-ink tabular-nums">{formatCurrency(d.amount ?? 0)}</span>
                  <PayoutActions payout={d} />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
