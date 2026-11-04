import React, { useState } from 'react';
import { Calculator, ListTree, Receipt } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';
import ErrorBanner from '../ui/ErrorBanner';
import { DetailList, DetailRow } from '../ui/DetailList';
import { CHARGE_LABEL, useBookingFinancials, useOverstayPreview } from '../../hooks/useFinancials';
import { apiErrorMessage } from '../../lib/apiError';
import { formatCurrency, formatDateTime } from '../../lib/utils';

const money = (n) => formatCurrency(Math.round(Number(n) || 0));

/** What a late return at a chosen time would cost (`.../overstay-preview?returnAt=`), for a car still out. */
function OverstayPreview({ bookingId }) {
  const [at, setAt] = useState('');
  const returnAt = at ? new Date(at).toISOString() : null;
  const { data, isFetching, isError, error } = useOverstayPreview(bookingId, returnAt);
  return (
    <div className="flex flex-col gap-3 border-t border-ink/10 pt-4">
      <p className="text-sm font-semibold text-ink inline-flex items-center gap-2">
        <Calculator size={15} className="text-accent" aria-hidden="true" /> If it comes back late
      </p>
      <Input label="Returned at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="sm:max-w-xs" />
      {isFetching ? (
        <Spinner label="Working out the overstay" />
      ) : isError ? (
        <p role="alert" className="text-sm text-red-600">{apiErrorMessage(error, "Couldn't work out the overstay.")}</p>
      ) : data ? (
        Number(data.totalCharge) > 0 ? (
          <p className="text-sm text-ink">
            <strong className="tabular-nums">{money(data.totalCharge)}</strong> overstay — {data.overstayDays} day{data.overstayDays === 1 ? '' : 's'}{' '}
            ({data.overstayHours} h late) at {money(data.dailyRate)}/day × {data.multiplier}.
          </p>
        ) : (
          <p className="text-sm text-muted">No overstay charge — within the agreed time or the grace period.</p>
        )
      ) : null}
    </div>
  );
}

/**
 * A booking's money on the admin's booking page (`GET /admin/financials/bookings/{bookingId}`): what the renter was
 * billed and paid, what the platform kept, what the owner is owed and has been paid — each charge on its own line — and,
 * while the car is out, what a late return would cost.
 *
 * @param {object} booking — `BookingResponse`
 */
export default function BookingFinancialsCard({ booking }) {
  const { data: f, isLoading, isError, error, refetch } = useBookingFinancials(booking.id);
  const charges = Array.isArray(f?.charges) ? f.charges : [];
  if (!isLoading && !isError && !f) return null;

  return (
    <Card className="p-5 flex flex-col gap-4" aria-label="Money">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-heading text-ink text-base font-semibold inline-flex items-center gap-2">
          <Receipt size={16} className="text-accent" aria-hidden="true" /> Money
        </h2>
        {f && <Badge label={f.fullySettled ? 'Settled' : f.allChargesPaid ? 'Owner not fully paid' : 'Not fully paid'} variant={f.fullySettled ? 'success' : 'warning'} />}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner label="Loading the booking's money" /></div>
      ) : isError ? (
        <ErrorBanner message={apiErrorMessage(error, "Could not load the booking's money.")} onRetry={refetch} />
      ) : (
        <>
          <DetailList>
            <DetailRow label="Billed to renter" valueClassName="tabular-nums">{money(f.totalBilledToRenter)}</DetailRow>
            <DetailRow label="Collected" valueClassName="tabular-nums font-semibold">{money(f.totalCollectedFromRenter)}</DetailRow>
            <DetailRow label="Commission" valueClassName="tabular-nums">{money(f.totalPlatformCommission)}</DetailRow>
            <DetailRow label="Processing fees" valueClassName="tabular-nums">{money(f.totalProcessingFees)}</DetailRow>
            <DetailRow label="Owner paid" valueClassName="tabular-nums">
              {money(f.totalOwnerPayoutsDisbursed)} of {money(f.totalOwnerPayoutsPromised)}
            </DetailRow>
            <DetailRow label="Still owed to owner" valueClassName="tabular-nums font-semibold" hidden={!(Number(f.totalOwnerPayoutsOutstanding) > 0)}>
              {money(f.totalOwnerPayoutsOutstanding)}
            </DetailRow>
            <DetailRow label="Platform net" valueClassName="tabular-nums">{money(f.platformNetProfit)}</DetailRow>
            <DetailRow label="Overstay" hidden={!(Number(f.overstayHours) > 0)}>
              {f.overstayHours} h late · {f.overstayDaysCharged} day{f.overstayDaysCharged === 1 ? '' : 's'} charged
            </DetailRow>
          </DetailList>

          {charges.length > 0 && (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <caption className="sr-only">Charges on this booking</caption>
                <thead>
                  <tr className="border-b border-ink/10 text-left text-muted">
                    <th scope="col" className="py-2 pr-3 font-medium">Charge</th>
                    <th scope="col" className="py-2 pr-3 font-medium text-right">Charged</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Paid</th>
                    <th scope="col" className="py-2 pr-3 font-medium text-right">To owner</th>
                    <th scope="col" className="py-2 font-medium">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c, i) => (
                    <tr key={c.paymentId || i} className="border-b border-ink/5 align-top">
                      <td className="py-2 pr-3 text-ink">
                        {CHARGE_LABEL[c.chargeType] || c.chargeType || 'Charge'}
                        {c.paymentMethod && <span className="block text-xs text-muted">{c.paymentMethod}{c.paymentReceipt ? ` · ${c.paymentReceipt}` : ''}</span>}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink">{money(c.totalCharged)}</td>
                      <td className="py-2 pr-3">
                        <Badge label={c.charged ? 'Paid' : c.paymentStatus || 'Not paid'} variant={c.charged ? 'success' : 'warning'} />
                        {c.paymentDate && <span className="block text-xs text-muted mt-0.5">{formatDateTime(c.paymentDate)}</span>}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink">
                        {money(c.ownerPayoutDisbursed)} <span className="text-muted">of {money(c.ownerPayoutPromised)}</span>
                      </td>
                      <td className="py-2">
                        <Badge label={c.disbursed ? 'Paid out' : c.disbursementStatus || 'Not yet'} variant={c.disbursed ? 'success' : 'neutral'} />
                        {c.disbursementReference && <span className="block text-xs text-muted mt-0.5">Ref {c.disbursementReference}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Button size="sm" variant="outline" className="self-start" to={`/admin/bookings/${booking.id}/transaction`}>
            <ListTree size={14} aria-hidden="true" /> See the full breakdown
          </Button>

          {booking.status === 'ACTIVE' && <OverstayPreview bookingId={booking.id} />}
        </>
      )}
    </Card>
  );
}
