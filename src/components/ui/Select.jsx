import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Accessible select dropdown — the same outlined field as Input, with its label in the top border.
 *
 * @param {string} label
 * @param {string} name
 * @param {{ value: string, label: string }[]} options
 * @param {string} error
 * @param {object} register — RHF register result
 * @param {string} placeholder — text for the default empty option
 * @param {string} className
 */
export default function Select({
  label,
  name,
  options = [],
  error,
  register,
  placeholder = 'Select an option',
  className = '',
  ...rest
}) {
  const id = useId();
  const descId = `${id}-error`;

  return (
    <div className={`flex flex-col gap-1 pt-2 ${className}`}>
      <div className="relative">
      <label htmlFor={id} className="field-label absolute -top-2 left-3 z-[1] px-1 text-xs leading-none text-muted bg-[linear-gradient(to_bottom,transparent_50%,theme(colors.surface)_50%)]">
        {label}
      </label>
      <select
        id={id}
        name={name}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? descId : undefined}
        className={`field-control w-full rounded-tile bg-surface border px-4 text-ink placeholder-muted text-sm
          focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition h-12 pr-10
          appearance-none cursor-pointer
          ${error ? 'border-red-500' : 'border-line hover:border-accent/60'}`}
        {...(register || {})}
        {...rest}
      >
        <option value="" className="bg-surface">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-icon" />
      </div>
      {error && (
        <p id={descId} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
