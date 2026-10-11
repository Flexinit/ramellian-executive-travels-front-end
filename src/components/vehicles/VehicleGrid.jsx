import React from 'react';
import { SearchX } from 'lucide-react';
import VehicleCard from './VehicleCard';
import VehicleCardSkeleton from './VehicleCardSkeleton';
import EmptyState from '../ui/EmptyState';
import ErrorBanner from '../ui/ErrorBanner';
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
 */
export default function VehicleGrid({ vehicles, isLoading, isError, error, onRetry, onClearFilters, pageSize, resetKey }) {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {pages.pageItems.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>
      {pageSize && <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} noun="vehicles" />}
    </div>
  );
}
