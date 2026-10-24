import React, { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Accessible text input with label, error, and hint support — the design system's outlined field, its label set
 * into the top border.
 * Pass `register` from React Hook Form to bind validation. A `type="password"` field gets an eye button to show or
 * hide what's typed (it starts hidden).
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
  const isPassword = type === 'password';
  const [shown, setShown] = useState(false);

  return (
    <div className={`flex flex-col gap-1 pt-2 ${className}`}>
      <div className="relative">
      <label htmlFor={id} className="field-label absolute -top-2 left-3 z-[1] px-1 text-xs leading-none text-muted bg-[linear-gradient(to_bottom,transparent_50%,theme(colors.surface)_50%)]">
        {label}
        {required && (
          <span aria-hidden="true" className="text-accent">
            {' '}*
          </span>
        )}
      </label>
      <input
        id={id}
        name={name}
        type={isPassword && shown ? 'text' : type}
        aria-required={required || undefined}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={hasDesc ? descId : undefined}
        className={`field-control w-full rounded-tile bg-surface border px-4 text-ink placeholder-muted text-sm
          focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition h-12
          ${error ? 'border-red-500' : 'border-line hover:border-accent/60'} ${isPassword ? 'pr-11' : ''}`}
        {...(register || {})}
        {...rest}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? 'Hide characters' : 'Show characters'}
          aria-pressed={shown}
          aria-controls={id}
          title={shown ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-ink focus-ring rounded-r-lg"
        >
          {shown ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      )}
      </div>
      {hasDesc && (
        <p id={descId} className={`text-xs ${error ? 'text-red-600' : 'text-muted'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
