import React from 'react';
import Spinner from '../ui/Spinner';

/**
 * Suspense fallback for route-level lazy imports (implementation-plan.md
 * 12.7) — shown briefly while a page's chunk downloads on navigation.
 * Distinct from PageLoader, which is a one-time full-screen splash for the
 * very first page load, not a per-navigation loading state.
 */
export default function RouteFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Spinner size="lg" label="Loading page" />
    </div>
  );
}
