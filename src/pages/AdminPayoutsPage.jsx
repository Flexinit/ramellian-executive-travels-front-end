import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import SegmentedControl from '../components/ui/SegmentedControl';
import { apiGet, apiPost } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { formatCurrency, formatDateTime } from '../lib/utils';

/**
 * Owner payouts (`disbursement-controller`, live spec 2026-10-16): each paid booking's payout to its owner —
 * `GET /admin/disbursements?status=PENDING|COMPLETED|FAILED` → `DisbursementResponse[]` (vehicle, owner, amount,
 * status, who triggered it and when, reference, notes). A pending one is **marked paid** with the payment's reference
 * (`POST /admin/disbursements/{id}/trigger` { reference, notes }) or **marked failed** with a reason
 * (`POST .../fail` { reference?, notes }).
 *
 * Since 2026-10-26 (live spec) a payout can also be **PROCESSING** — sent, but not yet confirmed by the payment
 * provider — and `POST /admin/disbursements/{id}/sync` (no body) asks the provider for its latest status and
 * returns the updated `DisbursementResponse`. No payouts existed yet to try it on, so the page shows whatever status
 * comes back rather than assuming one.
 */
const STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
const LABEL = { PENDING: 'To pay', PROCESSING: 'Processing', COMPLETED: 'Paid', FAILED: 'Failed' };
const VARIANT = { PENDING: 'warning', PROCESSING: 'info', COMPLETED: 'success', FAILED: 'danger' };

function useDisbursements(status) {
  return useQuery({ queryKey: ['admin', 'disbursements', status], queryFn: () => apiGet('/admin/disbursements', { status }) });
}

function useResolve() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reference, notes }) => apiPost(`/admin/disbursements/${id}/${action}`, { ...(reference ? { reference } : {}), ...(notes ? { notes } : {}) }),
    onSuccess: (_d, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'disbursements'] });
      toast.success(action === 'trigger' ? 'Payout marked as paid.' : 'Payout marked as failed.');
    },
  });
}

/** Asks the payment provider for a processing payout's latest status (`POST /admin/disbursements/{id}/sync`). */
function useSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiPost(`/admin/disbursements/${id}/sync`),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'disbursements'] });
      const status = updated?.status;
      toast.success(status ? `Payout status: ${(LABEL[status] || status).toLowerCase()}.` : 'Payout status checked.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't check the payout's status.")),
  });
}

export default function AdminPayoutsPage() {
  const [status, setStatus] = useState('PENDING');
  const { data, isLoading, isError, error, refetch } = useDisbursements(status);
  const list = Array.isArray(data) ? data : [];
  const resolve = useResolve();
  const sync = useSync();
  const [acting, setActing] = useState(null); // { item, action }
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  function open(item, action) {
    setActing({ item, action });
    setReference('');
    setNotes('');
    resolve.reset();
  }

  const paying = acting?.action === 'trigger';
  const canSubmit = paying ? reference.trim() : notes.trim();

  return (
    <PageWrapper className="max-w-6xl">
      <PageTitle title="Owner Payouts" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Owner Payouts</h1>
          <p className="text-muted text-sm mt-1.5">
            What each owner is owed for a paid booking. Mark it paid once the money is sent, with its reference. A payout
            that's <strong className="text-ink font-medium">Processing</strong> has been sent and is waiting for the payment
            provider — <strong className="text-ink font-medium">Check status</strong> asks for the latest.
          </p>
        </div>

        <SegmentedControl
          label="Payout status"
          options={STATUSES.map((s) => ({ value: s, label: LABEL[s] }))}
          value={status}
          onChange={setStatus}
          className="self-start"
        />

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" label="Loading payouts" /></div>
        ) : isError ? (
          <ErrorBanner message={apiErrorMessage(error, 'Could not load the payouts.')} onRetry={refetch} />
        ) : list.length === 0 ? (
          <EmptyState title={`No payouts ${LABEL[status].toLowerCase()}`} description="Payouts appear here once a booking is paid for." />
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((d) => (
              <Card key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-ink font-semibold">{d.vehicleTitle || 'Vehicle'}</span>
                    <Badge label={LABEL[d.status] || d.status} variant={VARIANT[d.status] || 'neutral'} />
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
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <span className="text-lg font-bold text-ink tabular-nums">{formatCurrency(d.amount ?? 0)}</span>
                  {d.status === 'PROCESSING' && (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={sync.isPending && sync.variables === d.id}
                      onClick={() => sync.mutate(d.id)}
                    >
                      <RefreshCw size={14} aria-hidden="true" /> Check status
                    </Button>
                  )}
                  {d.status === 'PENDING' && (
                    <>
                      <Button size="sm" onClick={() => open(d, 'trigger')}><CheckCircle2 size={14} aria-hidden="true" /> Mark paid</Button>
                      <Button size="sm" variant="danger" onClick={() => open(d, 'fail')}><XCircle size={14} aria-hidden="true" /> Failed</Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!acting} onClose={() => setActing(null)} title={paying ? 'Mark payout as paid' : 'Mark payout as failed'}>
        {acting && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              {formatCurrency(acting.item.amount ?? 0)} to {acting.item.ownerName || acting.item.ownerEmail}.
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
              <Button onClick={() => setActing(null)}>Cancel</Button>
              <Button
                variant={paying ? 'default' : 'danger'}
                disabled={!canSubmit}
                loading={resolve.isPending}
                onClick={() => resolve.mutate({ id: acting.item.id, action: acting.action, reference: reference.trim(), notes: notes.trim() }, { onSuccess: () => setActing(null) })}
              >
                {paying ? 'Mark paid' : 'Mark failed'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
