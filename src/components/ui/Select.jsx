import React, { useId } from 'react';

/**
 * Accessible select dropdown.
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
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-brand-white">
        {label}
      </label>
      <select
        id={id}
        name={name}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? descId : undefined}
        className={`w-full rounded-lg bg-white/5 border px-3 py-2.5 text-brand-white text-sm
          focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition
          appearance-none cursor-pointer
          ${error ? 'border-red-500' : 'border-white/10 hover:border-brand-gold/50'}`}
        {...(register || {})}
        {...rest}
      >
        <option value="" className="bg-brand-navy">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-brand-navy">
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={descId} className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
