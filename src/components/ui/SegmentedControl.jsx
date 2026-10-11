import React from 'react';

/**
 * A pill-shaped "pick one of a few" switch (booking mode, fleet tier…). One is
 * always selected; the selected one gets the gold-outline look of the Button. Use this instead of hand-styling a
 * row of buttons.
 *
 * @param {{ value: any, label: string }[]} options
 * @param {any} value — the selected option's value
 * @param {(value: any) => void} onChange
 * @param {string} label — accessible name of the group
 * @param {'radio'|'tab'} kind — `radio` for a form choice, `tab` when it switches what's shown
 * @param {'sm'|'md'} size
 * @param {string} className — layout only
 */
export default function SegmentedControl({ options, value, onChange, label, kind = 'radio', size = 'md', className = '' }) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs whitespace-nowrap',
    md: 'px-5 py-2 text-sm',
  };
  const isRadio = kind === 'radio';

  return (
    <div
      role={isRadio ? 'radiogroup' : 'tablist'}
      aria-label={label}
      className={`inline-flex rounded-full bg-white/5 border border-white/10 p-1 w-fit ${className}`}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={String(opt.value ?? 'all')}
            type="button"
            role={isRadio ? 'radio' : 'tab'}
            {...(isRadio ? { 'aria-checked': selected } : { 'aria-selected': selected })}
            onClick={() => onChange(opt.value)}
            className={`font-semibold rounded-full border transition-colors focus-ring ${sizes[size]} ${
              selected ? 'bg-brand-gold/15 text-brand-gold border-brand-gold' : 'border-transparent text-brand-grey hover:text-brand-white'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
