import React, { useId } from 'react';

/**
 * The owner's on/off switch for "Available for booking" — one click pulls a
 * vehicle from renters (or puts it back). Purely presentational: the caller
 * does the update (see `useSetVehicleAvailability`).
 *
 * @param {boolean} available — current state
 * @param {(next: boolean) => void} onToggle
 * @param {boolean} [pending] — disables the switch while an update is in flight
 */
export default function AvailabilitySwitch({ available, onToggle, pending = false }) {
  const labelId = useId();

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-black/5 px-3 py-2">
      <span className="flex flex-col">
        <span id={labelId} className="text-xs font-medium text-ink">
          Available for booking
        </span>
        <span className="text-[11px] text-muted">{available ? 'On — renters can book it' : "Off — renters can't see it"}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={available}
        aria-labelledby={labelId}
        disabled={pending}
        onClick={() => onToggle(!available)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${
          available ? 'bg-accent border-accent' : 'bg-black/10 border-black/20'
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${available ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
}
