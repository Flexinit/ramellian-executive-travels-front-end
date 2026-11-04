import React, { useId, useMemo, useState } from 'react';
import { format, parseISO, startOfYear, subDays } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { BarChart3, Banknote, CalendarCheck, Calculator, CreditCard, Landmark, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import ErrorBanner from '../ui/ErrorBanner';
import SegmentedControl from '../ui/SegmentedControl';
import ToggleChip from '../ui/ToggleChip';
import StatTile from './StatTile';
import {
  ratePercent, useAnalyticsSummary, useBookingAnalytics, useDailyEarnings, useTopOwners, useTopVehicles,
} from '../../hooks/useAnalytics';
import { apiErrorMessage } from '../../lib/apiError';
import { formatCurrency } from '../../lib/utils';

const ISO = 'yyyy-MM-dd';
const iso = (d) => format(d, ISO);

/** Quick ranges, each ending today; **Custom** keeps whatever dates were typed. */
const PRESETS = [
  { value: '7', label: '7 days', range: () => ({ from: iso(subDays(new Date(), 6)), to: iso(new Date()) }) },
  { value: '30', label: '30 days', range: () => ({ from: iso(subDays(new Date(), 29)), to: iso(new Date()) }) },
  { value: '90', label: '90 days', range: () => ({ from: iso(subDays(new Date(), 89)), to: iso(new Date()) }) },
  { value: 'year', label: 'This year', range: () => ({ from: iso(startOfYear(new Date())), to: iso(new Date()) }) },
  { value: 'custom', label: 'Custom', range: null },
];

/**
 * Two series, one per share of each day's money — fixed slots from the project's validated chart palette (the dataviz
 * skill's slots 1 and 3, as in BookingsChart): checked light (#fcfcfb) and dark (#141a2b), adjacent CVD ΔE 19.6.
 */
const EARNING_SERIES = [
  { key: 'platformEarnings', label: 'Platform earnings', color: '#3987e5' },
  { key: 'ownerPayouts', label: 'Owner payouts', color: '#199e70' },
];

const STATUS_LABEL = {
  PENDING: 'Pending', CONFIRMED: 'Confirmed', ACTIVE: 'Active', COMPLETED: 'Completed', CANCELLED: 'Cancelled', REJECTED: 'Rejected',
};

const money = (n) => formatCurrency(Math.round(Number(n) || 0));
const count = (n) => (Number(n) || 0).toLocaleString('en-KE');
const percent = (n) => `${(Math.round(n * 10) / 10).toLocaleString('en-KE')}%`;

/** "+12.5% vs previous period" — the arrow and sign carry the direction, not the colour alone. */
function Growth({ value }) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  const Icon = n < 0 ? TrendingDown : TrendingUp;
  return (
    <span className="inline-flex items-center gap-1">
      <Icon size={12} aria-hidden="true" className={n < 0 ? 'text-red-600' : 'text-green-600'} />
      {n > 0 ? '+' : ''}{percent(n)} vs previous period
    </span>
  );
}

function EarningsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-ink/10 bg-surface px-3 py-2 shadow-card text-xs min-w-40">
      <p className="text-ink font-semibold mb-1">{label}</p>
      {EARNING_SERIES.map((s) => (
        <p key={s.key} className="flex items-center gap-1.5 text-muted">
          <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} aria-hidden="true" />
          {s.label}: <span className="text-ink font-medium tabular-nums">{money(row[s.key])}</span>
        </p>
      ))}
      <p className="text-muted mt-1">Gross: <span className="text-ink font-medium tabular-nums">{money(row.grossRevenue)}</span> · {count(row.paymentCount)} payments</p>
    </div>
  );
}

/** Each day's money split into the platform's earnings and the owners' share, stacked; **Table view** shows the same. */
function DailyEarnings({ range }) {
  const { data, isLoading, isError, error, refetch } = useDailyEarnings(range);
  const [tableView, setTableView] = useState(false);
  const titleId = useId();
  const days = useMemo(
    () => (Array.isArray(data) ? data : []).map((d) => ({ ...d, label: d.date ? format(parseISO(d.date), 'd MMM', { locale: enGB }) : '' })),
    [data]
  );

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 id={titleId} className="font-heading text-ink text-base font-semibold">Daily earnings</h3>
        <div className="flex gap-2">
          <ToggleChip active={!tableView} onClick={() => setTableView(false)}>Chart</ToggleChip>
          <ToggleChip active={tableView} onClick={() => setTableView(true)}>Table view</ToggleChip>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorBanner message={apiErrorMessage(error, 'Could not load the daily earnings.')} onRetry={refetch} />
      ) : days.length === 0 ? (
        <EmptyState icon={BarChart3} title="No earnings in this period" description="Pick a longer period, or check back once payments come in." />
      ) : tableView ? (
        <div className="table-scroll">
          <table className="w-full text-sm" aria-labelledby={titleId}>
            <thead>
              <tr className="border-b border-ink/10 text-left text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Day</th>
                <th scope="col" className="py-2 pr-4 font-medium text-right">Gross</th>
                {EARNING_SERIES.map((s) => <th scope="col" key={s.key} className="py-2 pr-4 font-medium text-right">{s.label}</th>)}
                <th scope="col" className="py-2 font-medium text-right">Payments</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.date} className="border-b border-ink/5">
                  <td className="py-2 pr-4 text-ink">{d.label}</td>
                  <td className="py-2 pr-4 text-right text-ink font-semibold tabular-nums">{money(d.grossRevenue)}</td>
                  {EARNING_SERIES.map((s) => <td key={s.key} className="py-2 pr-4 text-right text-ink tabular-nums">{money(d[s.key])}</td>)}
                  <td className="py-2 text-right text-ink tabular-nums">{count(d.paymentCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div style={{ width: '100%', height: 280 }} role="img" aria-labelledby={titleId}>
            <ResponsiveContainer>
              <BarChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
                <CartesianGrid stroke="#6B6B6B" strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#6B6B6B', fontSize: 10 }} axisLine={{ stroke: '#6B6B6B', strokeOpacity: 0.3 }} tickLine={false} interval="preserveStartEnd" />
                <YAxis
                  tick={{ fill: '#6B6B6B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000).toLocaleString('en-KE')}k` : v)}
                />
                <Tooltip content={<EarningsTooltip />} cursor={{ fill: '#6B6B6B', fillOpacity: 0.08 }} />
                {EARNING_SERIES.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    stackId="money"
                    fill={s.color}
                    // A 2px gap in the card's own colour between the stacked parts (a class: SVG attributes can't
                    // read the theme's CSS variables); the top one gets the rounded data end.
                    className="stroke-surface"
                    strokeWidth={2}
                    radius={i === EARNING_SERIES.length - 1 ? [4, 4, 0, 0] : 0}
                    maxBarSize={28}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul aria-label="Series" className="flex flex-wrap gap-x-4 gap-y-1.5">
            {EARNING_SERIES.map((s) => (
              <li key={s.key} className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} aria-hidden="true" />
                {s.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function BookingRates({ range }) {
  const { data, isLoading, isError, error, refetch } = useBookingAnalytics(range);
  const byStatus = Object.entries(data?.countByStatus || {}).filter(([, n]) => Number(n) > 0);
  const confirmation = ratePercent(data?.confirmationRate);
  const cancellation = ratePercent(data?.cancellationRate);

  return (
    <Card className="p-5 flex flex-col gap-4">
      <h3 className="font-heading text-ink text-base font-semibold">Bookings</h3>
      {isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : isError ? (
        <ErrorBanner message={apiErrorMessage(error, 'Could not load the booking figures.')} onRetry={refetch} />
      ) : (
        <>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div><dt className="text-xs text-muted">Bookings</dt><dd className="font-heading text-ink text-xl font-bold tabular-nums">{count(data?.totalBookings)}</dd></div>
            <div><dt className="text-xs text-muted">Confirmed</dt><dd className="font-heading text-ink text-xl font-bold tabular-nums">{confirmation == null ? '—' : percent(confirmation)}</dd></div>
            <div><dt className="text-xs text-muted">Cancelled</dt><dd className="font-heading text-ink text-xl font-bold tabular-nums">{cancellation == null ? '—' : percent(cancellation)}</dd></div>
          </dl>
          {byStatus.length > 0 && (
            <ul aria-label="Bookings by status" className="flex flex-wrap gap-2">
              {byStatus.map(([status, n]) => (
                <li key={status} className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                  {STATUS_LABEL[status] || status}: <span className="text-ink font-semibold tabular-nums">{count(n)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

/** A ranked table — top vehicles or top owners. */
function TopTable({ title, query, columns, rowKey, empty }) {
  const { data, isLoading, isError, error, refetch } = query;
  const rows = Array.isArray(data) ? data : [];
  const titleId = useId();
  return (
    <Card className="p-5 flex flex-col gap-4 min-w-0">
      <h3 id={titleId} className="font-heading text-ink text-base font-semibold">{title}</h3>
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : isError ? (
        <ErrorBanner message={apiErrorMessage(error, `Could not load ${title.toLowerCase()}.`)} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <div className="table-scroll">
          <table className="w-full text-sm" aria-labelledby={titleId}>
            <thead>
              <tr className="border-b border-ink/10 text-left text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">#</th>
                {columns.map((c) => <th scope="col" key={c.label} className={`py-2 pr-3 font-medium ${c.numeric ? 'text-right' : ''}`}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row[rowKey] || i} className="border-b border-ink/5">
                  <td className="py-2 pr-3 text-muted tabular-nums">{i + 1}</td>
                  {columns.map((c) => (
                    <td key={c.label} className={`py-2 pr-3 text-ink ${c.numeric ? 'text-right tabular-nums' : ''}`}>{c.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/**
 * Platform analytics for administrators (`analytics-controller`, live spec 2026-10-27 — see hooks/useAnalytics.js):
 * the money and bookings for a chosen period, growth against the period before it, each day's earnings, and the
 * vehicles and owners that earned the most. The period applies to everything on the tab; it starts at the last 30 days.
 */
export default function AnalyticsSection() {
  const [preset, setPreset] = useState('30');
  const [range, setRange] = useState(() => PRESETS[1].range());
  const summary = useAnalyticsSummary(range);
  const topVehicles = useTopVehicles(range);
  const topOwners = useTopOwners(range);
  const s = summary.data || {};

  function choose(value) {
    setPreset(value);
    const next = PRESETS.find((p) => p.value === value)?.range;
    if (next) setRange(next());
  }
  function setDate(field) {
    return (e) => {
      setPreset('custom');
      setRange((r) => ({ ...r, [field]: e.target.value }));
    };
  }

  const loading = summary.isLoading;
  const tiles = [
    { icon: Banknote, label: 'Gross revenue', value: money(s.grossRevenue), detail: <Growth value={s.revenueGrowthPct} /> },
    { icon: Landmark, label: 'Platform earnings', value: money(s.platformEarnings), detail: <Growth value={s.earningsGrowthPct} /> },
    { icon: CalendarCheck, label: 'Bookings', value: count(s.totalBookings), detail: <Growth value={s.bookingGrowthPct} /> },
    { icon: Calculator, label: 'Average booking', value: money(s.avgBookingValue) },
    { icon: Wallet, label: 'Owners earned', value: money(s.ownerPayoutsEarned), detail: `${money(s.totalDisbursed)} paid out · ${money(s.pendingDisbursements)} to pay` },
    {
      icon: CreditCard,
      label: 'Payments',
      value: count(s.successfulPayments),
      detail: `successful · ${count(s.pendingPayments)} pending · ${count(s.failedPayments)} failed`,
    },
  ];

  return (
    <section aria-labelledby="analytics-heading" className="flex flex-col gap-4">
      <h2 id="analytics-heading" className="font-heading text-ink text-lg font-semibold">Analytics</h2>

      <div className="flex flex-wrap items-end gap-3">
        <SegmentedControl kind="radio" size="sm" label="Period" options={PRESETS.map(({ value, label }) => ({ value, label }))} value={preset} onChange={choose} />
        <div className="flex flex-wrap gap-3">
          <Input label="From" type="date" value={range.from} max={range.to} onChange={setDate('from')} className="w-40" />
          <Input label="To" type="date" value={range.to} min={range.from} onChange={setDate('to')} className="w-40" />
        </div>
      </div>

      {summary.isError ? (
        <ErrorBanner message={apiErrorMessage(summary.error, 'Could not load the analytics.')} onRetry={summary.refetch} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {tiles.map((t) => <StatTile key={t.label} icon={t.icon} label={t.label} value={t.value} loading={loading} detail={t.detail} />)}
        </div>
      )}
      {!loading && !summary.isError && (
        <p className="text-xs text-muted">
          Fees in this period: {money(s.transactionFees)} transaction fees · {money(s.deliveryFees)} delivery · {money(s.driverCharges)} drivers.
        </p>
      )}

      <DailyEarnings range={range} />
      <BookingRates range={range} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <TopTable
          title="Top vehicles"
          query={topVehicles}
          rowKey="vehicleId"
          empty="No bookings in this period."
          columns={[
            { label: 'Vehicle', render: (v) => <span>{v.model || 'Vehicle'}{v.registrationNumber && <span className="text-muted"> · {v.registrationNumber}</span>}</span> },
            { label: 'Bookings', numeric: true, render: (v) => count(v.bookingCount) },
            { label: 'Gross', numeric: true, render: (v) => money(v.grossRevenue) },
            { label: 'Platform', numeric: true, render: (v) => money(v.platformEarnings) },
          ]}
        />
        <TopTable
          title="Top owners"
          query={topOwners}
          rowKey="ownerId"
          empty="No bookings in this period."
          columns={[
            { label: 'Owner', render: (o) => <span className="flex flex-col"><span>{o.name || o.email || 'Owner'}</span>{o.name && o.email && <span className="text-xs text-muted">{o.email}</span>}</span> },
            { label: 'Vehicles', numeric: true, render: (o) => count(o.vehicleCount) },
            { label: 'Bookings', numeric: true, render: (o) => count(o.bookingCount) },
            { label: 'Gross', numeric: true, render: (o) => money(o.grossRevenue) },
            { label: 'Owner share', numeric: true, render: (o) => money(o.ownerPayouts) },
          ]}
        />
      </div>
    </section>
  );
}
