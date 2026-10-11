import React, { useEffect, useId, useRef, useState } from 'react';

/**
 * Accessible textarea with character counter.
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
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-brand-white">
          {label}
        </label>
        {maxLength !== undefined && (
          <span id={countId} className="text-xs text-brand-grey" aria-live="polite">
            {length} / {maxLength}
          </span>
        )}
      </div>
      <textarea
        id={id}
        name={name}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error || hint ? descId : maxLength !== undefined ? countId : undefined}
        className={`w-full rounded-lg bg-white/5 border px-3 py-2.5 text-brand-white placeholder-brand-grey text-sm resize-none
          focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition
          ${error ? 'border-red-500' : 'border-white/10 hover:border-brand-gold/50'}`}
        {...(register || {})}
        ref={(el) => {
          elementRef.current = el;
          register?.ref?.(el);
        }}
        onChange={handleChange}
        {...rest}
      />
      {(error || hint) && (
        <p id={descId} role={hint && !error ? 'status' : undefined} className={`text-xs ${error ? 'text-red-400' : 'text-brand-gold'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
