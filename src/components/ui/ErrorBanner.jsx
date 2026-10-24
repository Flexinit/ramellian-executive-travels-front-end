import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

/**
 * Retryable error banner with role="alert".
 *
 * @param {string} message
 * @param {function} onRetry — if provided, shows "Try again" button
 */
export default function ErrorBanner({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3"
    >
      <AlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
      <div className="flex flex-1 items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-red-700">{message}</p>
        {onRetry && (
          <Button variant="danger" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
