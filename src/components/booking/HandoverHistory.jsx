import React from 'react';
import { KeyRound, FlagOff, AlertTriangle, MapPin, Gauge, Fuel, PenLine } from 'lucide-react';
import { useHandovers } from '../../hooks/useVehicleHandover';
import { FUEL_LEVEL_LABELS } from '../../lib/constants';
import { formatDateTime } from '../../lib/utils';

const TYPE_META = {
  PICKUP: { label: 'Pickup', icon: KeyRound },
  DROPOFF: { label: 'Return', icon: FlagOff },
};

/** One recorded handover (pickup or return) — everything the renter entered, read-only. */
function HandoverRecord({ handover }) {
  const meta = TYPE_META[handover.type] || TYPE_META.PICKUP;
  const Icon = meta.icon;

  return (
    <div className="flex flex-col gap-2.5 py-3 border-t border-white/10 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-white">
          <Icon size={15} className="text-brand-gold" aria-hidden="true" />
          {meta.label}
        </span>
        <span className="text-xs text-brand-grey">{formatDateTime(handover.handoverTime)}</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <div className="flex items-center gap-1.5 text-brand-grey">
          <Gauge size={13} aria-hidden="true" />
          Odometer
        </div>
        <dd className="text-brand-white text-right">{handover.odometerReading ?? '—'} km</dd>

        <div className="flex items-center gap-1.5 text-brand-grey">
          <Fuel size={13} aria-hidden="true" />
          Fuel level
        </div>
        <dd className="text-brand-white text-right">{FUEL_LEVEL_LABELS[handover.fuelLevel] || handover.fuelLevel || '—'}</dd>

        {handover.location && (
          <>
            <div className="flex items-center gap-1.5 text-brand-grey">
              <MapPin size={13} aria-hidden="true" />
              Location
            </div>
            <dd className="text-brand-white text-right">{handover.location}</dd>
          </>
        )}
      </dl>

      {handover.conditionNotes && (
        <p className="text-sm text-brand-grey">
          <span className="text-brand-white">Condition notes: </span>
          {handover.conditionNotes}
        </p>
      )}

      {handover.damageNoted && (
        <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-start gap-1.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>Damage noted: {handover.damageDescription || 'no further description given.'}</span>
        </p>
      )}

      {handover.signedBy && (
        <p className="text-xs text-brand-grey inline-flex items-center gap-1.5">
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
      <h2 className="text-sm font-semibold text-brand-white">Vehicle Handover</h2>
      <div className="bg-brand-navy border border-white/10 rounded-2xl px-5">
        {handovers.map((h) => (
          <HandoverRecord key={h.id} handover={h} />
        ))}
      </div>
    </div>
  );
}
