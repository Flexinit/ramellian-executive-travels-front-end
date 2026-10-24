import React, { useId } from 'react';

/**
 * Accessible checkbox with a label slot for arbitrary content (e.g. "I agree to the Terms of
 * Service" with inline links) — never a hand-rolled `<input type="checkbox">`. Pass `register`
 * from React Hook Form to bind validation, same convention as `Input`.
 *
 * @param {React.ReactNode} label — the text/links next to the box
 * @param {string} error
 * @param {object} register — RHF register result spread onto the input
 * @param {string} className
 */
export default function Checkbox({ label, error, register, className = '', ...rest }) {
  const id = useId();
  const descId = `${id}-desc`;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? descId : undefined}
          className={`mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border bg-surface accent-accent
            focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas transition
            ${error ? 'border-red-500' : 'border-ink/20'}`}
          {...(register || {})}
          {...rest}
        />
        <label htmlFor={id} className="text-sm text-muted leading-snug cursor-pointer">
          {label}
        </label>
      </div>
      {error && (
        <p id={descId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
