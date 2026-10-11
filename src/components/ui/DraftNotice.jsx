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
    <div role="status" className="flex items-start gap-3 rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-3">
      <History size={16} className="text-brand-gold mt-0.5 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm text-brand-white">
        We kept what you'd already entered.{note ? ` ${note}` : ''}{' '}
        <button
          type="button"
          onClick={onDiscard}
          className="text-brand-gold hover:text-brand-gold-light underline underline-offset-2 focus-ring rounded-sm"
        >
          Start over
        </button>
      </p>
    </div>
  );
}
