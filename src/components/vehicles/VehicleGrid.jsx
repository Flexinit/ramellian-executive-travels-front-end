import React, { useEffect, useRef } from 'react';
import { SearchX } from 'lucide-react';
import VehicleCard from './VehicleCard';
import VehicleCardSkeleton from './VehicleCardSkeleton';
import EmptyState from '../ui/EmptyState';
import ErrorBanner from '../ui/ErrorBanner';
import Button from '../ui/Button';
import Pagination from '../ui/Pagination';
import { usePagination } from '../../hooks/usePagination';

/**
 * @param {object[]} vehicles
 * @param {boolean} isLoading
 * @param {boolean} isError
 * @param {Error} error
 * @param {function} onRetry
 * @param {function} onClearFilters
 * @param {number} [pageSize] — split the vehicles into pages of this many; left out, every vehicle is shown at once
 * @param {any} [resetKey] — when it changes (a filter) the grid goes back to page 1
 * @param {boolean} [hasMore] — lazy loading: more vehicles can be fetched (`useVehicleAvailability`)
 * @param {function} [onLoadMore] — fetches the next lot; called by itself as the end of the grid scrolls into view
 * @param {boolean} [loadingMore] — the next lot is on its way (placeholder cards show at the end)
 */
export default function VehicleGrid({ vehicles, isLoading, isError, error, onRetry, onClearFilters, pageSize, resetKey, hasMore, onLoadMore, loadingMore }) {
  const list = vehicles || [];
  const pages = usePagination(list, pageSize || Math.max(list.length, 1), resetKey);

  if (isError) {
    // The backend only serves vehicles to a signed-in person (403 without a login), which is not a connection problem.
    const status = error?.response?.status;
    const signedOut = status === 401 || status === 403;
    return (
      <ErrorBanner
        message={
          signedOut
            ? 'Please log in to browse vehicles.'
            : error?.response?.data?.message || 'Failed to load vehicles. Please check your connection.'
        }
        onRetry={onRetry}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1800px]:grid-cols-5 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <VehicleCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No vehicles available"
        description="Try adjusting your filters or changing your travel dates."
        action={onClearFilters ? { label: 'Clear filters', onClick: onClearFilters } : undefined}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1800px]:grid-cols-5 gap-3 sm:gap-4">
        {pages.pageItems.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
        {loadingMore && Array.from({ length: 4 }).map((_, i) => <VehicleCardSkeleton key={`more-${i}`} />)}
      </div>
      {hasMore && onLoadMore && <LoadMore onLoadMore={onLoadMore} loading={loadingMore} />}
      {pageSize && <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} noun="vehicles" />}
    </div>
  );
}

/**
 * The end of a lazily loaded grid: asks for the next lot as soon as it comes within a screen of view, so the
 * person just keeps scrolling. The button is there for keyboards, screen readers and browsers without
 * IntersectionObserver.
 */
function LoadMore({ onLoadMore, loading }) {
  const sentinel = useRef(null);
  const latest = useRef(onLoadMore);
  useEffect(() => {
    latest.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const el = sentinel.current;
    // Re-attached after every load: an observer only reports changes, so if the end is still in view once a lot
    // arrives (a tall screen), the fresh observer's first report asks for the next one.
    if (!el || loading || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) latest.current();
    }, { rootMargin: '600px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading]);

  return (
    <div ref={sentinel} className="flex justify-center">
      <Button variant="outline" size="sm" loading={loading} onClick={() => latest.current()}>
        Show more vehicles
      </Button>
    </div>
  );
}
