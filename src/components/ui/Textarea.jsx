import React, { useEffect, useId, useRef, useState } from 'react';

/**
 * Accessible textarea with character counter — the same outlined field as Input, with its label in the top border.
 *
 * @param {string} label
 * @param {string} name
 * @param {number} maxLength
 * @param {string} error
 * @param {string} hint — helper text shown under the box (an error takes its place)
 * @param {object} register  — RHF register result
 * @param {string} className
 */
export default function Textarea({
  label,
  name,
  maxLength,
  error,
  hint,
  register,
  className = '',
  rows = 4,
  ...rest
}) {
  const id = useId();
  const descId = `${id}-desc`;
  const countId = `${id}-count`;
  const [length, setLength] = useState(0);
  const elementRef = useRef(null);

  function handleChange(e) {
    setLength(e.target.value.length);
    // This handler replaces the one `register` provides, so hand the event on — otherwise react-hook-form
    // never hears the edit (its watch/dirty tracking, and anything built on them, would miss this field).
    register?.onChange?.(e);
    rest.onChange?.(e);
  }

  // Keep the counter honest when the value is set from outside (e.g. a restored draft) rather than typed.
  useEffect(() => {
    const el = elementRef.current;
    if (el && el.value.length !== length) setLength(el.value.length);
  });

  return (
    <div className={`flex flex-col gap-1 pt-2 ${className}`}>
      <div className="relative">
      <label htmlFor={id} className="field-label absolute -top-2 left-3 z-[1] px-1 text-xs leading-none text-muted bg-[linear-gradient(to_bottom,transparent_50%,rgb(var(--c-surface))_50%)]">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error || hint ? descId : maxLength !== undefined ? countId : undefined}
        className={`field-control w-full rounded-tile bg-surface border px-4 text-ink placeholder-muted text-sm
          focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition py-3 resize-none
          ${error ? 'border-red-500' : 'border-line hover:border-accent/60'}`}
        {...(register || {})}
        ref={(el) => {
          elementRef.current = el;
          register?.ref?.(el);
        }}
        onChange={handleChange}
        {...rest}
      />
      </div>
      {maxLength !== undefined && (
        <span id={countId} className="self-end text-xs text-muted" aria-live="polite">
          {length} / {maxLength}
        </span>
      )}
      {(error || hint) && (
        <p id={descId} role={hint && !error ? 'status' : undefined} className={`text-xs ${error ? 'text-red-600' : 'text-muted'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
