import React, { useEffect, useId, useState } from 'react';

// Two native range inputs sit on top of each other; only their thumbs take pointer events, so both can be dragged.
const THUMB =
  'absolute inset-0 w-full h-6 appearance-none bg-transparent pointer-events-none m-0 focus:outline-none ' +
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 ' +
  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-dark ' +
  '[&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:shadow ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 ' +
  '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-brand-gold [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-dark ' +
  '[&::-moz-range-thumb]:cursor-grab focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-brand-gold/60';

/**
 * A two-handle range slider (e.g. a price range). Each handle is a real
 * `<input type="range">`, so it works with the keyboard (arrow keys) and screen
 * readers ("Minimum …" / "Maximum …"). While a handle is being moved only the
 * slider updates; `onCommit` is called once when it is let go — so a page that
 * refetches on change isn't hit on every pixel.
 *
 * @param {string} label — what the range is (e.g. "Price per day")
 * @param {number} min — lowest possible value
 * @param {number} max — highest possible value
 * @param {number} [step]
 * @param {{ min: number, max: number }} value — the current range
 * @param {(range: { min: number, max: number }) => void} onCommit
 * @param {(n: number) => string} [format] — how to show a value
 * @param {string} [className]
 */
export default function RangeSlider({ label, min, max, step = 1, value, onCommit, format = String, className = '' }) {
  const id = useId();
  const [draft, setDraft] = useState(value);

  // Follow the outside value (e.g. "Clear all", a shared link) when it changes.
  useEffect(() => {
    setDraft(value);
  }, [value.min, value.max]); // eslint-disable-line react-hooks/exhaustive-deps

  const span = Math.max(max - min, 1);
  const pct = (n) => ((Math.min(Math.max(n, min), max) - min) / span) * 100;

  function moveMin(e) {
    const next = Math.min(Number(e.target.value), draft.max - step);
    setDraft((d) => ({ ...d, min: Math.max(next, min) }));
  }
  function moveMax(e) {
    const next = Math.max(Number(e.target.value), draft.min + step);
    setDraft((d) => ({ ...d, max: Math.min(next, max) }));
  }
  const commit = () => onCommit(draft);

  const end = { onPointerUp: commit, onKeyUp: commit, onBlur: commit };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span id={`${id}-label`} className="text-sm font-medium text-brand-white">
          {label}
        </span>
        <span className="text-xs text-brand-gold tabular-nums" aria-live="polite">
          {format(draft.min)} – {format(draft.max)}
        </span>
      </div>

      <div role="group" aria-labelledby={`${id}-label`} className="relative h-6">
        <div aria-hidden="true" className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-white/15" />
        <div
          aria-hidden="true"
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-brand-gold"
          style={{ left: `${pct(draft.min)}%`, right: `${100 - pct(draft.max)}%` }}
        />
        <input
          type="range"
          aria-label={`Minimum ${label.toLowerCase()}`}
          aria-valuetext={format(draft.min)}
          min={min}
          max={max}
          step={step}
          value={draft.min}
          onChange={moveMin}
          className={THUMB}
          style={{ zIndex: draft.min > max - step * 2 ? 5 : 3 }}
          {...end}
        />
        <input
          type="range"
          aria-label={`Maximum ${label.toLowerCase()}`}
          aria-valuetext={format(draft.max)}
          min={min}
          max={max}
          step={step}
          value={draft.max}
          onChange={moveMax}
          className={THUMB}
          style={{ zIndex: 4 }}
          {...end}
        />
      </div>

      <div className="flex justify-between text-[11px] text-brand-white/70 tabular-nums" aria-hidden="true">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
