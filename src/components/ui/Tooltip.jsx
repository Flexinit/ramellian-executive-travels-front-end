import React, { useId, useState } from 'react';

/**
 * Hover tooltip — wraps any element with a description balloon.
 *
 * @param {string} content — tooltip text
 * @param {React.ReactNode} children — the trigger element
 * @param {'top'|'bottom'|'left'|'right'} position
 */
export default function Tooltip({ content, children, position = 'top' }) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  const positions = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {/* Clone child to inject aria-describedby */}
      {React.cloneElement(React.Children.only(children), {
        'aria-describedby': id,
      })}

      <span
        id={id}
        role="tooltip"
        style={{ visibility: visible ? 'visible' : 'hidden' }}
        className={`absolute z-50 ${positions[position]} whitespace-nowrap rounded-lg bg-brand-dark border border-white/15 px-2.5 py-1.5 text-xs text-brand-white shadow-lg pointer-events-none`}
      >
        {content}
      </span>
    </span>
  );
}
