import React from 'react';
import { Compass } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

/** Catch-all 404 — docs/design.md §2 (`*` route). */
export default function NotFoundPage() {
  return (
    <PageWrapper className="min-h-[60vh] flex items-center justify-center">
      <PageTitle title="Page Not Found" />
      <div className="flex flex-col items-center gap-2 text-center">
        {/*
          Visually-hidden h1 -> h2 pair, purely to give the page a correct
          document outline: EmptyState's own title always renders as an
          <h3>, so an h1 alone would skip a level (axe's heading-order
          rule) — see docs/implementation-plan.md 12.2.
        */}
        <h1 className="sr-only">Page Not Found</h1>
        <h2 className="sr-only">Error</h2>
        <span className="font-heading text-brand-gold text-sm font-semibold tracking-widest uppercase">404</span>
        <EmptyState
          icon={Compass}
          title="Page not found"
          description="The page you're looking for doesn't exist or may have moved."
        />
        <Button
          to="/"
          className="-mt-2"
        >
          Back to Home
        </Button>
      </div>
    </PageWrapper>
  );
}
