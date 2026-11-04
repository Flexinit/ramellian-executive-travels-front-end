import React from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Download, Printer } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import BackLink from '../components/ui/BackLink';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import { CHARGE_LABEL, useBookingFinancials } from '../hooks/useFinancials';
import { useBooking } from '../hooks/useBookings';
import { useVehicle } from '../hooks/useVehicles';
import { usePlatformSettings } from '../hooks/usePlatformSettings';
import { useBookingRefund } from '../hooks/useRefunds';
import {
  allocation, bookingReconciliation, chargeBuild, commissionRule, matches, ownerShareCheck, processingRule, transactionCsv,
} from '../lib/transactionMath';
import { apiErrorMessage } from '../lib/apiError';
import { printTransaction } from '../lib/printContract';
import { formatCurrency, formatDateRange, formatDateTime } from '../lib/utils';

/** Shillings, with cents only when there are any. */
const money = (n) => {
  const v = Number(n) || 0;
  return Number.isInteger(Math.round(v * 100) / 100) ? formatCurrency(Math.round(v)) : `KES ${v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Fixed categorical slots (the project's validated chart palette, slots 1–5 — as BookingsChart/AnalyticsSection; worst
 * adjacent CVD ΔE 8.4, so every part also carries its name and amount, never colour alone). Grey is for money the
 * recorded parts don't account for.
 */
const PART_COLOR = { owner: '#3987e5', commission: '#d95926', processing: '#199e70', delivery: '#c98500', driver: '#d55181', unexplained: '#8a8f98' };

/** ✓ or ⚠ with the words — a check never relies on colour alone. */
function Verdict({ ok, children }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
      <CheckCircle2 size={13} aria-hidden="true" /> {children || 'Adds up'}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 text-xs font-medium">
      <AlertTriangle size={13} aria-hidden="true" /> {children || 'Doesn’t add up'}
    </span>
  );
}

/** One worked check: what it should be (and how), what was recorded, and whether they agree. */
function CheckRow({ label, working, expected, recorded, note }) {
  const ok = expected == null || matches(expected, recorded);
  return (
    <tr className="border-b border-ink/5 align-top">
      <th scope="row" className="py-2 pr-3 text-left font-medium text-ink">{label}</th>
      <td className="py-2 pr-3 text-muted">{working}{note && <span className="block text-xs">{note}</span>}</td>
      <td className="py-2 pr-3 text-right tabular-nums text-ink">{expected == null ? '—' : money(expected)}</td>
      <td className="py-2 pr-3 text-right tabular-nums text-ink">{money(recorded)}</td>
      <td className="py-2">
        {expected == null ? <span className="text-xs text-muted">No rule to check</span> : (
          <Verdict ok={ok}>{ok ? 'Matches' : `Off by ${money(Number(recorded) - Number(expected))}`}</Verdict>
        )}
      </td>
    </tr>
  );
}

/** Where one charge's money went: a single proportional bar (labelled below) and the same as a table. */
function Allocation({ charge, index }) {
  const { parts, total, unexplained } = allocation(charge);
  const positive = parts.filter((p) => p.amount > 0);
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-ink">Where the {money(total)} went</h4>
      {total > 0 && (
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-ink/5" role="img" aria-label={`Charge ${index + 1}: ${positive.map((p) => `${p.label} ${money(p.amount)}`).join(', ')}`}>
          {positive.map((p) => (
            // A 2px gap in the card's colour between the parts.
            <div key={p.key} className="h-full border-r-2 border-surface last:border-r-0" style={{ width: `${Math.max(0.5, p.share * 100)}%`, backgroundColor: PART_COLOR[p.key] }} />
          ))}
        </div>
      )}
      <table className="w-full text-sm">
        <caption className="sr-only">Where charge {index + 1}&apos;s money went</caption>
        <tbody>
          {parts.map((p) => (
            <tr key={p.key} className="border-b border-ink/5">
              <th scope="row" className="py-1.5 pr-3 text-left font-normal text-ink">
                <span className="inline-flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PART_COLOR[p.key] }} aria-hidden="true" />
                  {p.label}
                </span>
              </th>
              <td className="py-1.5 pr-3 text-right tabular-nums text-ink">{money(p.amount)}</td>
              <td className="py-1.5 text-right tabular-nums text-muted w-16">{(p.share * 100).toFixed(1)}%</td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="py-1.5 pr-3 text-left font-semibold text-ink">Charged</th>
            <td className="py-1.5 pr-3 text-right tabular-nums font-semibold text-ink">{money(total)}</td>
            <td className="py-1.5 text-right"><Verdict ok={!unexplained} /></td>
          </tr>
        </tbody>
      </table>
      {unexplained !== 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          The recorded parts come to {money(total - unexplained)}, not the {money(total)} charged — {money(Math.abs(unexplained))} {unexplained > 0 ? 'isn’t accounted for' : 'more is paid out than was charged'}.
        </p>
      )}
    </div>
  );
}

function ChargeCard({ charge, index, booking, vehicle, settings }) {
  const build = chargeBuild(charge);
  const isRental = charge.chargeType !== 'OVERSTAY';
  const days = Number(booking?.numberOfDays) || 0;
  const daily = Number(vehicle?.dailyPrice) || 0;
  const baseWorking = isRental && daily && days ? `${money(daily)} a day × ${days} day${days === 1 ? '' : 's'} = ${money(daily * days)}` : null;
  const commission = commissionRule(charge.baseAmount, days, settings);
  const owner = ownerShareCheck(charge);
  const processing = processingRule(charge, settings);

  return (
    <Card className="p-5 flex flex-col gap-5 break-inside-avoid">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-ink text-base font-semibold">
            Charge {index + 1} · {CHARGE_LABEL[charge.chargeType] || charge.chargeType || 'Charge'}
          </h3>
          <p className="text-xs text-muted mt-0.5">
            {charge.paymentMethod || 'Payment'}{charge.paymentReceipt && ` · receipt ${charge.paymentReceipt}`}{charge.paymentDate && ` · ${formatDateTime(charge.paymentDate)}`}
          </p>
        </div>
        <Badge label={charge.charged ? 'Paid by renter' : charge.paymentStatus || 'Not paid'} variant={charge.charged ? 'success' : 'warning'} />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-ink">1. What the renter was charged</h4>
        <table className="w-full text-sm">
          <caption className="sr-only">How charge {index + 1} was built</caption>
          <tbody>
            {build.lines.map((l) => (
              <tr key={l.key} className="border-b border-ink/5">
                <th scope="row" className="py-1.5 pr-3 text-left font-normal text-ink">
                  {l.key === 'base' ? '' : '+ '}{l.label}
                  {l.key === 'base' && baseWorking && (
                    <span className="block text-xs text-muted">
                      {baseWorking} {matches(daily * days, l.amount) ? '✓' : `(recorded ${money(l.amount)})`}
                    </span>
                  )}
                  {l.key === 'processing' && processing.rule && <span className="block text-xs text-muted">{processing.rule}</span>}
                </th>
                <td className="py-1.5 text-right tabular-nums text-ink">{money(l.amount)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="py-1.5 pr-3 text-left font-semibold text-ink">= Total charged</th>
              <td className="py-1.5 text-right tabular-nums font-semibold text-ink">{money(build.recorded)}</td>
            </tr>
          </tbody>
        </table>
        <div className="flex justify-end">
          <Verdict ok={build.ok}>{build.ok ? `${money(build.sum)} — adds up` : `The lines add up to ${money(build.sum)}; ${money(build.recorded)} was recorded`}</Verdict>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-ink">2. How it was split</h4>
        <Allocation charge={charge} index={index} />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-ink">3. Checks</h4>
        <div className="table-scroll">
          <table className="w-full text-sm min-w-[560px]">
            <caption className="sr-only">Checks on charge {index + 1}</caption>
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Figure</th>
                <th scope="col" className="py-2 pr-3 font-medium">Worked out as</th>
                <th scope="col" className="py-2 pr-3 font-medium text-right">Expected</th>
                <th scope="col" className="py-2 pr-3 font-medium text-right">Recorded</th>
                <th scope="col" className="py-2 font-medium"><span className="sr-only">Result</span></th>
              </tr>
            </thead>
            <tbody>
              <CheckRow
                label="Commission"
                working={commission.ratePct == null ? commission.rule : `${commission.ratePct}% of ${money(charge.baseAmount)} — ${commission.rule}`}
                expected={isRental ? commission.expected : null}
                recorded={charge.platformCommission}
              />
              <CheckRow
                label="Owner's share"
                working={`${money(charge.baseAmount)} − ${money(charge.platformCommission)} commission`}
                expected={owner.expected}
                recorded={owner.recorded}
                note={owner.note}
              />
              <CheckRow label="Processing fee" working={processing.rule || 'Set by the payment provider'} expected={processing.expected} recorded={charge.processingFee} />
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-ink">4. Paid to the owner</h4>
        <p className="text-sm text-ink">
          <span className="tabular-nums">{money(charge.ownerPayoutDisbursed)}</span> paid of <span className="tabular-nums">{money(charge.ownerPayoutPromised)}</span> owed
          {Number(charge.ownerPayoutShortfall) > 0 && <> — <strong className="tabular-nums">{money(charge.ownerPayoutShortfall)}</strong> still to pay</>}
        </p>
        <p className="text-xs text-muted">
          <Badge label={charge.disbursed ? 'Paid out' : charge.disbursementStatus || 'No payout yet'} variant={charge.disbursed ? 'success' : 'neutral'} />
          {charge.disbursementReference && ` · ref ${charge.disbursementReference}`}
          {charge.disbursementDate && ` · ${formatDateTime(charge.disbursementDate)}`}
        </p>
      </div>
    </Card>
  );
}

/**
 * One booking's transaction, worked through (product owner, 2026-10-27: "understand the entire math"): every charge
 * built up line by line, where its money went, each figure checked against how it's worked out (commission rate, owner's
 * share, processing fee — see lib/transactionMath.js), what reached the owner, and the booking as a whole reconciled
 * against the platform's recorded net profit. Printable, and downloadable as CSV.
 */
export default function AdminBookingTransactionPage() {
  const { bookingId } = useParams();
  const fin = useBookingFinancials(bookingId);
  const { data: booking } = useBooking(bookingId);
  const { data: vehicle } = useVehicle(booking?.vehicleId);
  const { data: settings } = usePlatformSettings();
  const { data: refund } = useBookingRefund(bookingId);
  const f = fin.data;
  const refunded = refund?.status === 'COMPLETED' ? Number(refund.amount) || 0 : 0;
  const charges = Array.isArray(f?.charges) ? f.charges : [];

  function downloadCsv() {
    const blob = new Blob([transactionCsv(f, refunded)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking-${bookingId}-transaction.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (fin.isLoading) {
    return <PageWrapper className="flex justify-center py-20"><Spinner size="lg" label="Loading the transaction" /></PageWrapper>;
  }

  if (fin.isError || !f) {
    return (
      <PageWrapper className="max-w-4xl flex flex-col gap-4">
        <BackLink to={`/admin/bookings/${bookingId}`} label="Back to booking" />
        {fin.isError
          ? <ErrorBanner message={apiErrorMessage(fin.error, 'Could not load the transaction.')} onRetry={fin.refetch} />
          : <EmptyState title="No money recorded for this booking yet" description="It appears once the renter has been charged." />}
      </PageWrapper>
    );
  }

  const r = bookingReconciliation(f, refunded);
  const title = f.vehicleTitle || vehicle?.title || 'Booking';

  return (
    <PageWrapper className="max-w-4xl">
      <PageTitle title="Transaction breakdown" />
      {/* `.transaction-document`: what Print prints — the breakdown alone, not the portal around it. */}
      <div className="transaction-document flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <BackLink to={`/admin/bookings/${bookingId}`} label="Back to booking" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={printTransaction}><Printer size={14} aria-hidden="true" /> Print</Button>
            <Button size="sm" variant="outline" onClick={downloadCsv}><Download size={14} aria-hidden="true" /> Download CSV</Button>
          </div>
        </div>

        <div>
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Transaction breakdown</h1>
          <p className="text-muted text-sm mt-1.5">
            {title}{f.startTime && ` · ${formatDateRange(f.startTime, f.endTime)}`}
            {f.renterEmail && ` · renter ${f.renterEmail}`}{f.ownerEmail && ` · owner ${f.ownerEmail}`}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge label={f.fullySettled ? 'Fully settled' : 'Not settled yet'} variant={f.fullySettled ? 'success' : 'warning'} />
            {f.bookingStatus && <Badge label={f.bookingStatus} variant="neutral" />}
            {Number(f.overstayHours) > 0 && <Badge label={`${f.overstayHours} h late · ${f.overstayDaysCharged} day(s) charged`} variant="warning" />}
          </div>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['Billed to renter', r.billed],
            ['Collected', r.collected],
            ['Owed to owner', r.owner],
            ['Platform keeps', r.kept],
          ].map(([label, value]) => (
            <Card key={label} className="p-4">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-heading text-ink text-lg sm:text-xl font-bold tabular-nums">{money(value)}</dd>
            </Card>
          ))}
        </dl>

        <section aria-labelledby="charges-heading" className="flex flex-col gap-4">
          <h2 id="charges-heading" className="font-heading text-ink text-lg font-semibold">Charge by charge</h2>
          {charges.length === 0
            ? <Card className="p-5 text-sm text-muted">No charges recorded.</Card>
            : charges.map((c, i) => <ChargeCard key={c.paymentId || i} charge={c} index={i} booking={booking} vehicle={vehicle} settings={settings} />)}
        </section>

        <section aria-labelledby="whole-heading" className="flex flex-col gap-3">
          <h2 id="whole-heading" className="font-heading text-ink text-lg font-semibold">The whole booking</h2>
          <Card className="p-5 flex flex-col gap-3">
            <table className="w-full text-sm">
              <caption className="sr-only">The booking reconciled</caption>
              <tbody>
                <tr className="border-b border-ink/5">
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">Collected from the renter</th>
                  <td className="py-2 text-right tabular-nums text-ink">{money(r.collected)}</td>
                </tr>
                <tr className="border-b border-ink/5">
                  <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">
                    − Owed to the owner
                    <span className="block text-xs text-muted">{money(r.ownerPaid)} paid · {money(r.ownerOutstanding)} still to pay</span>
                  </th>
                  <td className="py-2 text-right tabular-nums text-ink">{money(r.owner)}</td>
                </tr>
                {r.refunded > 0 && (
                  <tr className="border-b border-ink/5">
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">− Refunded to the renter</th>
                    <td className="py-2 text-right tabular-nums text-ink">{money(r.refunded)}</td>
                  </tr>
                )}
                <tr className="border-b border-ink/10">
                  <th scope="row" className="py-2 pr-3 text-left font-semibold text-ink">
                    = The platform keeps
                    <span className="block text-xs font-normal text-muted">{money(r.commission)} commission · {money(r.processing)} processing fees</span>
                  </th>
                  <td className="py-2 text-right tabular-nums font-semibold text-ink">{money(r.kept)}</td>
                </tr>
                {r.recordedNet != null && (
                  <tr>
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-ink">Net profit recorded by the system</th>
                    <td className="py-2 text-right tabular-nums text-ink">{money(r.recordedNet)}</td>
                  </tr>
                )}
              </tbody>
            </table>
            {r.recordedNet != null && (
              <Verdict ok={r.keptMatchesNet}>
                {r.keptMatchesNet
                  ? 'What the platform keeps matches the recorded net profit'
                  : `The recorded net profit is ${money(r.recordedNet - r.kept)} ${r.recordedNet > r.kept ? 'more' : 'less'} than what's left after the owner — usually provider costs, delivery or driver money kept by the platform, or a refund not yet completed`}
              </Verdict>
            )}
            {r.unpaidByRenter > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">{money(r.unpaidByRenter)} billed to the renter hasn&apos;t been collected yet.</p>
            )}
          </Card>
        </section>

        <p className="text-xs text-muted">
          Checks use today&apos;s Platform Settings (commission rates, fees). A booking made before a settings change was
          priced at the rates of its day, so an older one can show a difference that isn&apos;t an error.
        </p>
      </div>
    </PageWrapper>
  );
}
