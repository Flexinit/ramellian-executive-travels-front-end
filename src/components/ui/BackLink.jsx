import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Button from './Button';

/**
 * A "go back" link — the shared `Button`'s quiet outlined pill (like the design's round back button), with a
 * leading `ArrowLeft`. Drop it right after
 * `PageTitle` on any page that would otherwise leave someone with no way back except the browser's own Back
 * button (a page reached only by drilling into something, with no persistent nav link to its parent list).
 *
 * @param {string} to — where it goes (a route, not browser history — see Button's `to`)
 * @param {string} [label] — defaults to "Back"
 * @param {object} [state] — router state for the page it opens (e.g. `{ bookingId }` for a booking step)
 */
export default function BackLink({ to, label = 'Back', state, className = '' }) {
  return (
    <Button to={to} state={state} variant="outline" size="sm" className={`self-start ${className}`}>
      <ArrowLeft size={14} aria-hidden="true" />
      {label}
    </Button>
  );
}
