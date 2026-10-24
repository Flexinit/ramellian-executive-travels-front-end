import React, { useId, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Card from '../ui/Card';
import ToggleChip from '../ui/ToggleChip';
import SegmentedControl from '../ui/SegmentedControl';
import EmptyState from '../ui/EmptyState';
import { bookingsByPeriod, OUTCOME_GROUPS } from '../../lib/reports';

/**
 * Fixed categorical slots (dataviz skill’s default palette, slots 1–5 — built to read on light and dark surfaces;
 * the card is white now). Originally checked against the old dark card: worst adjacent CVD ΔE 8.4. One color per outcome, in a fixed order
 * (never reassigned when a period has fewer outcomes present), since this is series identity, not a
 * good/bad status readout — `BookingStatusBadge`'s own status colors collapse Confirmed/Active/Completed to
 * the same green, which is exactly wrong for telling these apart in one chart.
 */
const SERIES_COLOR = {
  upcoming: '#3987e5',
  active: '#d95926',
  completed: '#199e70',
  cancelled: '#c98500',
  rejected: '#d55181',
};

const GRANULARITY_OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const GRANULARITY_COLUMN_LABEL = { day: 'Day', week: 'Week', month: 'Month' };

/** Recharts' own tooltip content, styled to the brand's dark surface — only the outcomes actually present
 * in this period are listed, per the "selective direct labels" rule rather than a zero for every series. */
function PeriodTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const present = payload.filter((p) => p.value > 0);
  return (
    <div className="rounded-lg border border-black/10 bg-surface px-3 py-2 shadow-card text-xs min-w-32">
      <p className="text-ink font-semibold mb-1">{label}</p>
      {present.length === 0 ? (
        <p className="text-muted">No bookings</p>
      ) : (
        present.map((p) => (
          <p key={p.dataKey} className="flex items-center gap-1.5 text-muted">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.color }} aria-hidden="true" />
            {OUTCOME_GROUPS.find((g) => g.key === p.dataKey)?.label}: <span className="text-ink font-medium">{p.value}</span>
          </p>
        ))
      )}
    </div>
  );
}

/**
 * A line chart of bookings per day/week/month by outcome (Upcoming/Active/Completed/Cancelled/Rejected) —
 * the trend behind `ReportSummaryCards`' outcome pills, built from the same `BookingReportResponse`
 * (`bookingsByPeriod`, `lib/reports.js`). Hovering shows the exact breakdown for that point via Recharts'
 * own tooltip; **Table view** swaps to the same data as an accessible table, so nothing here is chart-only.
 *
 * @param {object} [report] a BookingReportResponse
 */
export default function BookingsChart({ report }) {
  const [granularity, setGranularity] = useState('month');
  const [tableView, setTableView] = useState(false);
  const periods = useMemo(() => bookingsByPeriod(report, granularity), [report, granularity]);
  const titleId = useId();

  if (periods.length === 0) {
    return (
      <Card className="p-5">
        <EmptyState icon={BarChart3} title="No bookings to chart yet" description="Once bookings start coming in, the trend shows up here." />
      </Card>
    );
  }

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h3 id={titleId} className="font-heading text-ink text-base font-semibold">
          Bookings over time
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            kind="radio"
            size="sm"
            label="Group bookings by"
            value={granularity}
            onChange={setGranularity}
            options={GRANULARITY_OPTIONS}
          />
          <div className="flex gap-2">
            <ToggleChip active={!tableView} onClick={() => setTableView(false)}>
              Chart
            </ToggleChip>
            <ToggleChip active={tableView} onClick={() => setTableView(true)}>
              Table view
            </ToggleChip>
          </div>
        </div>
      </div>

      {tableView ? (
        <div className="table-scroll">
          <table className="w-full text-sm" aria-labelledby={titleId}>
            <thead>
              <tr className="border-b border-black/10 text-left text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">
                  {GRANULARITY_COLUMN_LABEL[granularity]}
                </th>
                {OUTCOME_GROUPS.map((g) => (
                  <th scope="col" key={g.key} className="py-2 pr-4 font-medium text-right">
                    {g.label}
                  </th>
                ))}
                <th scope="col" className="py-2 font-medium text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.period} className="border-b border-black/5">
                  <td className="py-2 pr-4 text-ink">{p.label}</td>
                  {OUTCOME_GROUPS.map((g) => (
                    <td key={g.key} className="py-2 pr-4 text-right text-ink tabular-nums">
                      {p[g.key]}
                    </td>
                  ))}
                  <td className="py-2 text-right text-ink font-semibold tabular-nums">{p.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div style={{ width: '100%', height: 280 }} role="img" aria-labelledby={titleId}>
            <ResponsiveContainer>
              <LineChart data={periods} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#6B6B6B', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis allowDecimals={false} tick={{ fill: '#6B6B6B', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<PeriodTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                {OUTCOME_GROUPS.map((g) => (
                  <Line
                    key={g.key}
                    type="monotone"
                    dataKey={g.key}
                    name={g.label}
                    stroke={SERIES_COLOR[g.key]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <ul aria-label="Outcome" className="flex flex-wrap gap-x-4 gap-y-1.5">
            {OUTCOME_GROUPS.map((g) => (
              <li key={g.key} className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: SERIES_COLOR[g.key] }} aria-hidden="true" />
                {g.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
