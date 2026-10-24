import React from 'react';
import { KeyRound, FlagOff, AlertTriangle, MapPin, Gauge, Fuel, PenLine } from 'lucide-react';
import { useHandovers } from '../../hooks/useVehicleHandover';
import { FUEL_LEVEL_LABELS } from '../../lib/constants';
import { formatDateTime } from '../../lib/utils';
import { DetailList, DetailRow } from '../ui/DetailList';

const TYPE_META = {
  PICKUP: { label: 'Pickup', icon: KeyRound },
  DROPOFF: { label: 'Return', icon: FlagOff },
};

/** One recorded handover (pickup or return) — everything the renter entered, read-only. */
function HandoverRecord({ handover }) {
  const meta = TYPE_META[handover.type] || TYPE_META.PICKUP;
  const Icon = meta.icon;

  return (
    <div className="flex flex-col gap-2.5 py-3 border-t border-ink/10 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Icon size={15} className="text-accent" aria-hidden="true" />
          {meta.label}
        </span>
        <span className="text-xs text-muted">{formatDateTime(handover.handoverTime)}</span>
      </div>

      <DetailList>
        <DetailRow label={<span className="inline-flex items-center gap-1.5"><Gauge size={13} aria-hidden="true" />Odometer</span>}>{handover.odometerReading ?? '—'} km</DetailRow>
        <DetailRow label={<span className="inline-flex items-center gap-1.5"><Fuel size={13} aria-hidden="true" />Fuel level</span>}>
          {FUEL_LEVEL_LABELS[handover.fuelLevel] || handover.fuelLevel || '—'}
        </DetailRow>
        <DetailRow label={<span className="inline-flex items-center gap-1.5"><MapPin size={13} aria-hidden="true" />Location</span>} hidden={!handover.location}>
          {handover.location}
        </DetailRow>
      </DetailList>

      {handover.conditionNotes && (
        <p className="text-sm text-muted">
          <span className="text-ink">Condition notes: </span>
          {handover.conditionNotes}
        </p>
      )}

      {handover.damageNoted && (
        <p className="text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-start gap-1.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>Damage noted: {handover.damageDescription || 'no further description given.'}</span>
        </p>
      )}

      {handover.signedBy && (
        <p className="text-xs text-muted inline-flex items-center gap-1.5">
          <PenLine size={12} aria-hidden="true" />
          Signed by {handover.signedBy}
          {handover.signedAt ? ` · ${formatDateTime(handover.signedAt)}` : ''}
        </p>
      )}
    </div>
  );
}

/**
 * Read-only history of this booking's recorded handovers — what the renter entered at pickup and/or return
 * (odometer, fuel, condition, any damage noted, and the owner or dispatcher's own signature co-signing it —
 * see `VehicleHandoverForm`'s own doc comment for why it's recorded this way), straight from
 * `GET /handovers/bookings/{bookingId}`. Shown to both sides — the renter on their own booking page, the
 * owner/admin here — since an owner can't submit one themselves (the backend only accepts handover details
 * from the renter) but still needs to see what was recorded. Renders nothing at all once there are no
 * handovers yet, so a booking that hasn't reached pickup shows nothing extra.
 *
 * @param {string} bookingId
 */
export default function HandoverHistory({ bookingId }) {
  const { data } = useHandovers(bookingId);
  const handovers = Array.isArray(data) ? data : [];

  if (handovers.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold text-ink">Vehicle Handover</h2>
      <div className="bg-surface border border-ink/10 rounded-2xl px-5">
        {handovers.map((h) => (
          <HandoverRecord key={h.id} handover={h} />
        ))}
      </div>
    </div>
  );
}
