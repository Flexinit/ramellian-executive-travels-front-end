import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, CreditCard, Eye, Landmark, List, Send, Smartphone, Users } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ErrorBanner from '../components/ui/ErrorBanner';
import SegmentedControl from '../components/ui/SegmentedControl';
import PaymentTransactionDetailModal from '../components/admin/PaymentTransactionDetailModal';
import {
  TRANSACTION_TYPE_LABEL,
  transactionStatusLabel,
  transactionStatusVariant,
  usePaymentTransactions,
} from '../hooks/usePaymentTransactions';
import { useServerPagination } from '../hooks/usePagination';
import { useAuthStore } from '../store/authStore';
import { apiErrorMessage } from '../lib/apiError';
import { transactionRef } from '../lib/mpesaCallback';
import { SEARCH_DEBOUNCE_MS } from '../lib/constants';
import { formatCurrency, formatDateTime } from '../lib/utils';

const PAGE_SIZE = 20;
/** One tab per kind of transaction (product owner, 2026-11-04), plus all of them. */
const TYPE_TABS = [
  { value: 'all', label: 'All', icon: List },
  { value: 'MPESA_STK', label: 'M-Pesa payments', icon: Smartphone },
  { value: 'MPESA_SPLIT_STK', label: 'M-Pesa split payments', icon: Users },
  { value: 'MPESA_B2C', label: 'M-Pesa payouts', icon: Send },
  { value: 'PESAPAL_CARD', label: 'Pesapal payments', icon: CreditCard },
  { value: 'PESAPAL_B2C', label: 'Pesapal payouts', icon: Landmark },
];
// Money paid out to owners; everything else came in from renters.
const OUTGOING = new Set(['MPESA_B2C', 'PESAPAL_B2C']);

/** The value, but only after it has stopped changing for a moment (so typing doesn't fire a request per key). */
function useDebounced(value) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return settled;
}

/** A picked day (`2026-11-04`) as the start or the end of that day in local time, as the ISO date-time the ledger takes. */
const dayBound = (day, end) => (day ? new Date(`${day}T${end ? '23:59:59.999' : '00:00:00'}`).toISOString() : undefined);

/**
 * Payment Transactions (`GET /admin/payment-transactions`, `GET /admin/payment-transactions/{id}`): the ledger of every
 * M-Pesa and Pesapal transaction — payments in and payouts out — newest first, filterable by type, status, phone,
 * booking and dates, a page at a time. A row opens the full transaction.
 */
export default function AdminPaymentTransactionsPage() {
  // The open tab lives in the address (?type=MPESA_B2C), so it survives a reload and can be linked to.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TYPE_TABS.some((t) => t.value === searchParams.get('type')) ? searchParams.get('type') : 'all';
  const setTab = (value) => setSearchParams(value === 'all' ? {} : { type: value }, { replace: true });
  const [status, setStatus] = useState('');
  const [phone, setPhone] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [fromDay, setFromDay] = useState('');
  const [toDay, setToDay] = useState('');
  const [openId, setOpenId] = useState(null);

  const settledBooking = useDebounced(bookingId.trim());
  const filters = {
    type: tab === 'all' ? '' : tab,
    status: useDebounced(status.trim().toUpperCase()),
    phone: useDebounced(phone.replace(/\s+/g, '')),
    // A booking id is a UUID; anything shorter is still being typed (the backend refuses a partial one).
    bookingId: /^[0-9a-f-]{36}$/i.test(settledBooking) ? settledBooking : '',
    from: dayBound(fromDay, false),
    to: dayBound(toDay, true),
  };
  // A new filter starts again from the first page.
  const pager = useServerPagination(PAGE_SIZE, [filters.type, filters.status, filters.phone, filters.bookingId, filters.from, filters.to].join('|'));

  const { data, isLoading, isError, error, refetch, isFetching } = usePaymentTransactions({ ...filters, ...pager.request });
  const entries = Array.isArray(data?.content) ? data.content : [];
  // A backend without the ledger yet (the VPS, 2026-11-04) answers 404, and one that refuses this account 403: either
  // way the page says it isn't available and leaves the menu (never an error the admin can't do anything about).
  const missing = [403, 404].includes(error?.response?.status);
  useEffect(() => {
    if (missing) useAuthStore.getState().denyPath('/admin/payment-transactions');
  }, [missing]);

  return (
    <PageWrapper>
      <PageTitle title="Payment Transactions" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Payment Transactions</h1>
          <p className="text-muted text-sm mt-1">
            Every M-Pesa and Pesapal transaction — payments from renters and payouts to owners — newest first. Open one for
            its references and the provider&apos;s reply.
          </p>
        </div>

        <SegmentedControl kind="tab" size="sm" label="Kind of transaction" options={TYPE_TABS} value={tab} onChange={setTab} className="self-start max-w-full" />

        <div role="tabpanel" aria-label={TYPE_TABS.find((t) => t.value === tab).label} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <Input label="Status" name="status" placeholder="e.g. SUCCESSFUL" value={status} onChange={(e) => setStatus(e.target.value)} />
            <Input label="Phone" name="phone" type="search" inputMode="tel" placeholder="e.g. 254712345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Booking ID" name="bookingId" type="search" placeholder="The booking's full ID" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
            <Input label="From" name="from" type="date" value={fromDay} max={toDay || undefined} onChange={(e) => setFromDay(e.target.value)} />
            <Input label="To" name="to" type="date" value={toDay} min={fromDay || undefined} onChange={(e) => setToDay(e.target.value)} />
          </div>
          {data && (
            <p className="text-muted text-sm -mt-3" aria-live="polite">
              {data.totalElements} {data.totalElements === 1 ? 'transaction' : 'transactions'}
            </p>
          )}

          {isError && !missing && <ErrorBanner message={apiErrorMessage(error, "We couldn't load the payment transactions just now.")} onRetry={refetch} />}

          {isLoading ? (
            <div className="flex flex-col gap-2" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            !isError && <EmptyState icon={ArrowLeftRight} title="No transactions found" description="Try different filters." />
          ) : (
            <div className={`table-scroll rounded-2xl border border-ink/10 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
              <table className="stack-table w-full text-left">
                <thead>
                  <tr className="border-b border-ink/10">
                    {['When', 'Type', 'Ref', 'Who', 'Amount', 'Status'].map((col) => (
                      <th key={col} scope="col" className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                        {col}
                      </th>
                    ))}
                    <th scope="col" className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/5">
                  {entries.map((t) => {
                    const open = () => setOpenId(t.id);
                    const typeLabel = TRANSACTION_TYPE_LABEL[t.type] || t.type || 'Transaction';
                    const out = OUTGOING.has(t.type);
                    const ref = transactionRef(t);
                    return (
                      <tr
                        key={t.id}
                        tabIndex={0}
                        onClick={open}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') open();
                        }}
                        aria-label={`Open ${typeLabel} of ${formatCurrency(Number(t.amount) || 0)}`}
                        className="cursor-pointer hover:bg-ink/5 transition-colors focus-ring"
                      >
                        <td data-label="When" className="stack-full px-4 py-3 text-sm text-muted whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                        <td data-label="Type" className="px-4 py-3 text-sm text-ink">{typeLabel}</td>
                        <td data-label="Ref" className="px-4 py-3 text-sm font-medium text-ink tracking-wide break-all">{ref || '—'}</td>
                        <td data-label="Who" className="stack-full px-4 py-3 text-sm text-ink break-all">
                          {t.partyName || t.renterName || t.phone || t.renterPhone || t.email || '—'}
                          {(t.partyName || t.renterName) && (t.phone || t.renterPhone) && <span className="block text-xs text-muted">{t.phone || t.renterPhone}</span>}
                          {/* Paid by someone other than the renter (a split payer): whose booking it was for. */}
                          {!out && t.partyName && t.renterName && t.renterName !== t.partyName && (
                            <span className="block text-xs text-muted">for {t.renterName}</span>
                          )}
                        </td>
                        <td data-label="Amount" className={`px-4 py-3 text-sm font-semibold tabular-nums whitespace-nowrap ${out ? 'text-ink' : 'text-green-700 dark:text-green-400'}`}>
                          {out ? '−' : '+'} {formatCurrency(Number(t.amount) || 0)}
                        </td>
                        <td data-label="Status" className="px-4 py-3">
                          <Badge label={transactionStatusLabel(t.status)} variant={transactionStatusVariant(t.status)} />
                        </td>
                        <td data-label="" className="stack-full px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); open(); }}
                            aria-label={`View ${typeLabel} of ${formatCurrency(Number(t.amount) || 0)}`}
                          >
                            <Eye size={14} aria-hidden="true" /> View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {data && <Pagination {...pager.propsFor(data)} noun="transactions" />}
        </div>
      </div>

      <PaymentTransactionDetailModal id={openId} onClose={() => setOpenId(null)} />
    </PageWrapper>
  );
}
