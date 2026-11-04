import React, { useId } from 'react';

/**
 * An on/off switch (`role="switch"`) with its label and an optional line under it — the one switch for the portal,
 * instead of hand-styling a button each time. Navy track when on, grey when off.
 *
 * @param {boolean} checked
 * @param {(next: boolean) => void} onChange
 * @param {React.ReactNode} label
 * @param {React.ReactNode} [description] — e.g. what "on" and "off" mean right now
 * @param {boolean} [disabled]
 * @param {string} [className]
 * @param {boolean} [hideLabel] — the label (and description) for screen readers only, when the row around it shows them
 */
export default function Switch({ checked, onChange, label, description, disabled = false, className = '', hideLabel = false }) {
  const id = useId();
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <span className={hideLabel ? 'sr-only' : 'flex flex-col min-w-0'}>
        <span id={`${id}-label`} className="text-sm font-medium text-ink">{label}</span>
        {description && <span id={`${id}-desc`} className="text-xs text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${
          checked ? 'bg-accent border-accent' : 'bg-ink/10 border-ink/20'
        }`}
      >
        <span aria-hidden="true" className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}
