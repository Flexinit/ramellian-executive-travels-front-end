import React from 'react';
import { History } from 'lucide-react';

/**
 * Tells the person a saved draft was put back into the form, with a way to
 * throw it away and start fresh.
 *
 * @param {function} onDiscard
 * @param {string} [note] — extra sentence, e.g. what wasn't kept
 */
export default function DraftNotice({ onDiscard, note }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
      <History size={16} className="text-accent mt-0.5 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm text-ink">
        We kept what you'd already entered.{note ? ` ${note}` : ''}{' '}
        <button
          type="button"
          onClick={onDiscard}
          className="text-accent hover:text-accent-hover underline underline-offset-2 focus-ring rounded-sm"
        >
          Start over
        </button>
      </p>
    </div>
  );
}
