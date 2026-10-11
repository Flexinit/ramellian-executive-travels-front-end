import React, { useId } from 'react';

/**
 * Accessible text input with label, error, and hint support.
 * Pass `register` from React Hook Form to bind validation.
 *
 * @param {string} label
 * @param {string} name
 * @param {string} type
 * @param {string} error
 * @param {string} hint
 * @param {boolean} required — shows a * and sets aria-required (validation itself is the caller's, e.g. zod)
 * @param {object} register  — RHF register result spread onto the input
 * @param {string} className
 */
export default function Input({
  label,
  name,
  type = 'text',
  error,
  hint,
  required = false,
  register,
  className = '',
  ...rest
}) {
  const id = useId();
  const descId = `${id}-desc`;
  const hasDesc = !!(error || hint);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-brand-white">
        {label}
        {required && (
          <span aria-hidden="true" className="text-brand-gold">
            {' '}*
          </span>
        )}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={hasDesc ? descId : undefined}
        className={`w-full rounded-lg bg-white/5 border px-3 py-2.5 text-brand-white placeholder-brand-grey text-sm
          focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition
          ${error ? 'border-red-500' : 'border-white/10 hover:border-brand-gold/50'}`}
        {...(register || {})}
        {...rest}
      />
      {hasDesc && (
        <p id={descId} className={`text-xs ${error ? 'text-red-400' : 'text-brand-grey'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
