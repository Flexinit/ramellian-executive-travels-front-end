import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, CalendarCheck2, Receipt, Printer } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import StatTile from '../components/reports/StatTile';
import { apiGet } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { formatCurrency, formatDate } from '../lib/utils';
import { useMyVehicles } from '../hooks/useVehicles';
import OwnerPayoutsCard from '../components/owner/OwnerPayoutsCard';

/** `GET /owner/statements?vehicleId&from&to` → `OwnerStatementResponse` (live spec 2026-10-16). */
function useOwnerStatement({ vehicleId, from, to }) {
  return useQuery({
    queryKey: ['owner-statements', vehicleId || 'all', from || null, to || null],
    queryFn: () =>
      apiGet('/owner/statements', {
        ...(vehicleId ? { vehicleId } : {}),
        ...(from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}),
        ...(to ? { to: new Date(`${to}T23:59:59`).toISOString() } : {}),
      }),
    retry: false,
  });
}

function Table({ caption, head, rows }) {
  return (
    <Card className="p-0 overflow-hidden">
      <h2 className="px-5 pt-4 pb-3 font-heading text-ink text-base font-semibold">{caption}</h2>
      <div className="table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-ink/10 bg-black/[0.03] text-left text-xs uppercase tracking-wider text-muted">
              {head.map((h, i) => (
                <th key={h} scope="col" className={`px-5 py-2.5 font-medium ${i > 0 && /KES|Payout|Fee|Gross|Bookings|Days/.test(h) ? 'text-right' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {rows.map((cells, r) => (
              <tr key={r}>
                {cells.map((c, i) => (
                  <td key={i} className={`px-5 py-2.5 ${typeof c === 'number' || /^KES/.test(String(c)) ? 'text-right tabular-nums' : ''} ${i === 0 ? 'text-ink' : 'text-muted'}`}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/**
 * An owner's earnings statement (`GET /owner/statements`): for all vehicles or one, over any dates — the totals
 * (bookings, gross, the platform's commission and the payment processing fees taken out, and the payout), then
 * month by month, vehicle by vehicle, and every paid booking with its receipt number. Printable.
 */
export default function OwnerStatementsPage() {
  const [vehicleId, setVehicleId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { vehicles } = useMyVehicles();
  const statement = useOwnerStatement({ vehicleId, from, to });
  const s = statement.data;
  const sum = s?.summary || {};

  return (
    <PageWrapper className="max-w-6xl">
      <PageTitle title="Statements" />
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Statements</h1>
            <p className="text-muted text-sm mt-1.5">What your vehicles earned, and what was paid out to you.</p>
          </div>
          <Button size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer size={14} aria-hidden="true" /> Print / PDF
          </Button>
        </div>

        <Card className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          <Select
            label="Vehicle"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            placeholder="All vehicles"
            options={vehicles.map((v) => ({ value: v.id, label: v.model + (v.registrationNumber ? ` (${v.registrationNumber})` : '') }))}
          />
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </Card>

        {/* Where each payout stands (its own request — a problem there doesn't hide the statement). */}
        <OwnerPayoutsCard />

        {statement.isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" label="Loading your statement" /></div>
        ) : statement.isError ? (
          <ErrorBanner
            message={
              // A refusal here isn't an expired session (the app checks that separately): the backend didn't allow it.
              [401, 403].includes(statement.error?.response?.status)
                ? "Statements aren't available for your account right now. Please contact support."
                : apiErrorMessage(statement.error, 'Could not load your statement.')
            }
            onRetry={statement.refetch}
          />
        ) : (
          <>
            <p className="text-xs text-muted">
              {s?.from || s?.to ? `${s.from ? formatDate(s.from) : 'Start'} – ${s.to ? formatDate(s.to) : 'today'}` : 'All time'}
              {s?.generatedAt ? ` · generated ${formatDate(s.generatedAt)}` : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatTile icon={CalendarCheck2} label="Paid bookings" value={sum.totalBookings ?? 0} />
              <StatTile icon={Receipt} label="Gross" value={formatCurrency(sum.totalGrossRevenue ?? 0)} />
              <StatTile
                icon={Receipt}
                label="Fees taken out"
                value={formatCurrency((sum.totalPlatformFees ?? 0) + (sum.totalTransactionFees ?? 0))}
                detail={`Commission ${formatCurrency(sum.totalPlatformFees ?? 0)} · payment fees ${formatCurrency(sum.totalTransactionFees ?? 0)}`}
              />
              <StatTile icon={Wallet} label="Your payout" value={formatCurrency(sum.totalPayout ?? 0)} />
            </div>

            {!s?.entries?.length ? (
              <EmptyState title="No paid bookings in this period" description="Paid bookings show here, with what you earned from each." />
            ) : (
              <>
                {s.monthlyBreakdown?.length > 0 && (
                  <Table
                    caption="By month"
                    head={['Month', 'Bookings', 'Gross (KES)', 'Payout (KES)']}
                    rows={s.monthlyBreakdown.map((m) => [m.label || `${m.month}/${m.year}`, m.bookingCount ?? 0, formatCurrency(m.grossRevenue ?? 0), formatCurrency(m.payout ?? 0)])}
                  />
                )}
                {!vehicleId && s.vehicleBreakdown?.length > 0 && (
                  <Table
                    caption="By vehicle"
                    head={['Vehicle', 'Bookings', 'Gross (KES)', 'Payout (KES)']}
                    rows={s.vehicleBreakdown.map((v) => [v.vehicleTitle, v.bookingCount ?? 0, formatCurrency(v.grossRevenue ?? 0), formatCurrency(v.payout ?? 0)])}
                  />
                )}
                <Table
                  caption="Bookings"
                  head={['Vehicle', 'Renter', 'Dates', 'Days', 'Gross (KES)', 'Fees (KES)', 'Payout (KES)', 'Paid', 'Receipt']}
                  rows={s.entries.map((e) => [
                    e.vehicleTitle,
                    e.renterName || e.renterEmail || '—',
                    `${formatDate(e.startTime)} – ${formatDate(e.endTime)}`,
                    e.numberOfDays ?? '—',
                    formatCurrency(e.baseAmount ?? 0),
                    formatCurrency((e.platformFee ?? 0) + (e.transactionFee ?? 0)),
                    formatCurrency(e.ownerPayout ?? 0),
                    e.paidAt ? formatDate(e.paidAt) : '—',
                    e.receiptNumber || '—',
                  ])}
                />
              </>
            )}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
