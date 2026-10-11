import React from 'react';

/**
 * Three bouncing dots — the shared "something is in progress, inline" indicator, used where a spinner
 * would be too heavy (e.g. a chat bubble standing in for a message that's still sending). Colored via
 * `currentColor`, so it reads correctly inside whatever text color its container already sets.
 */
export default function TypingDots({ label = 'Sending', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} role="status" aria-label={label}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 animate-bounce" />
    </span>
  );
}
