import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import Button from '../components/ui/Button';
import SearchBar from '../components/forms/SearchBar';
import FilterPanel from '../components/forms/FilterPanel';
import SortDropdown from '../components/forms/SortDropdown';
import VehicleGrid from '../components/vehicles/VehicleGrid';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import { useVehicleAvailability } from '../hooks/useVehicles';
import { useBookingStore } from '../store/bookingStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { vehiclesNear } from '../lib/vehicleLocations';
import { BOOKING_MODES } from '../lib/constants';

// Kept across a fresh arrival at the page — everything else (location, dates, mode, tier, fuel,
// transmission, seats, free text) is a filter and is cleared. `sort` survives alongside the price
// range for the same reason FilterPanel's own "Clear all" spares it: choosing an order isn't filtering.
const KEEP_ON_ARRIVAL = ['minPrice', 'maxPrice', 'sort'];

/**
 * Reads filters straight from the URL (shareable/bookmarkable searches) and
 * passes them to `useVehicleAvailability`, which loads the results lazily — a page at a time as the person
 * scrolls (`GET /vehicles` is a Spring `Page`, live spec 2026-10-25).
 */
export default function VehiclesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fromSearch = !!useLocation().state?.fromSearch;

  // However this page was reached — a bookmark, a link with a preset filter, an earlier visit left in
  // the URL — only the price range (and sort) should still apply once it actually appears. Runs once
  // per mount, not on every filter picked while already here. The exception is the home page's search
  // bar (`state.fromSearch`): what was just searched for is exactly what should be shown.
  const cleaned = useRef(false);
  useEffect(() => {
    if (cleaned.current) return;
    cleaned.current = true;
    if (fromSearch) return;
    const stray = [...searchParams.keys()].some((key) => !KEEP_ON_ARRIVAL.includes(key));
    if (!stray) return;
    const next = new URLSearchParams();
    KEEP_ON_ARRIVAL.forEach((key) => {
      const value = searchParams.get(key);
      if (value) next.set(key, value);
    });
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `near` (the home search's pick-up place) isn't sent to the backend: it orders the results here instead.
  const { near, ...filters } = Object.fromEntries(searchParams.entries());
  // The narrow-screen Filters button: whether the panel is open, and how many filters are in use (the sort
  // isn't a filter; the free-text search shows in its own box).
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Tailwind's `lg` breakpoint: where the filters become a column beside the results. Assumed wide where it
  // can't be measured (tests).
  const wide = useMediaQuery('(min-width: 1024px)', true);
  const activeFilters = [...searchParams.keys()].filter((k) => k !== 'sort' && k !== 'query' && k !== 'near').length;

  // The dates, mode and places searched for here go with the renter to whichever vehicle they open, so its
  // booking form starts filled in (AddToBookingPanel) instead of asking for them again.
  const setSearch = useBookingStore((s) => s.setSearch);
  const query = searchParams.toString();
  useEffect(() => {
    const params = new URLSearchParams(query);
    const mode = params.get('selfDrive') === 'true'
      ? BOOKING_MODES.SELF_DRIVE
      : params.get('chauffeured') === 'true' ? BOOKING_MODES.CHAUFFEURED : undefined;
    setSearch({
      startTime: params.get('startTime') || undefined,
      endTime: params.get('endTime') || undefined,
      bookingMode: mode,
      pickupLocation: params.get('near') || params.get('location') || undefined,
      dropoffLocation: params.get('returnLocation') || undefined,
    });
  }, [query, setSearch]);

  const { vehicles: found, isLoading, isError, error, refetch, total, hasMore, loadMore, loadingMore } = useVehicleAvailability(filters);
  // Searched from the home page with a pick-up place: the cars based near it, or — if none are — every car, with a
  // note saying so (never an empty page just because no car is based at that exact address).
  const nearby = near ? vehiclesNear(found, near) : null;
  const vehicles = nearby ? nearby.vehicles : found;
  // One continuous grid, never split into a section per place (product owner, 2026-10-25): with a few cars per
  // place, sections left half-empty rows. The place is on each card and in the "Available in" filter; the order is
  // the chosen sort, or Recommended (free for the dates first — lib/vehicleRanking.js).

  // Vehicles load a page at a time, so the backend's own total says how many match — except when the list is
  // narrowed here to the cars near a pick-up place, where only what's shown can be counted.
  const count = !nearby && typeof total === 'number' ? total : vehicles.length;

  function handleClearFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  return (
    <>
      <PageWrapper className="!pt-6 lg:!pt-8">
      <PageTitle title="Browse Vehicles" />
      <div className="flex flex-col gap-5">
        {/* Sort by sits on the title's line rather than alone above the results, where it left a gap. */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-ink text-xl sm:text-2xl font-semibold">Browse Vehicles</h1>
            <p className="text-muted text-xs sm:text-sm mt-1">
              {isLoading ? 'Searching…' : `${count} vehicle${count === 1 ? '' : 's'} found`}
            </p>
            {nearby && !isLoading && !isError && (
              <p role="status" className="mt-1.5 text-xs sm:text-sm text-ink">
                {nearby.matched ? (
                  <>
                    Cars based near <span className="font-semibold">{near}</span>.{' '}
                  </>
                ) : (
                  <>
                    No cars are based near <span className="font-semibold">{near}</span> yet — showing every available car.{' '}
                  </>
                )}
                {nearby.matched && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      next.delete('near');
                      setSearchParams(next, { replace: true });
                    }}
                    className="font-semibold text-accent hover:text-accent-hover focus-ring rounded-md"
                  >
                    Show all
                  </button>
                )}
              </p>
            )}
          </div>
          <SortDropdown />
        </div>

        {/* The search and filters stay in view while the cars scroll. The search box is its own full-width
            bar pinned under the top bar (h-20), on the page's own background so the cards don't show through it as they scroll
            under. On a narrower screen the bar also holds the design's round filter button (with the number of filters in use), and
            the panel opens inside the bar (scrolling on its own); on a wide screen the panel is a column beside
            the results, pinned just below the bar. One FilterPanel, placed by `wide`, so its state is never
            duplicated. */}
        <div
          role="search"
          aria-label="Search vehicles"
          className="sticky top-20 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-3 bg-canvas flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <SearchBar />
            </div>
            {!wide && (
              <span className="relative shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Filters${activeFilters > 0 ? ` (${activeFilters} in use)` : ''}`}
                  aria-expanded={filtersOpen}
                  aria-controls="vehicle-filters"
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  <SlidersHorizontal size={18} aria-hidden="true" />
                </Button>
                {activeFilters > 0 && (
                  <span aria-hidden="true" className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-on-accent text-[10px] font-bold flex items-center justify-center">
                    {activeFilters}
                  </span>
                )}
              </span>
            )}
          </div>
          {!wide && (
            <div id="vehicle-filters" className={`${filtersOpen ? 'block' : 'hidden'} max-h-[60vh] overflow-y-auto`}>
              <FilterPanel />
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* The column's height leaves room for the page's bottom padding and footer below it (~6.5rem past
              the 10.5rem it sticks at): taller, and at the end of the results the row would push the column
              back up under the pinned search box. */}
          {wide && (
            <aside
              aria-label="Filters"
              className="w-72 shrink-0 self-start sticky top-[10.5rem] max-h-[calc(100vh-17rem)] overflow-y-auto rounded-card border border-line bg-surface p-4"
            >
              <FilterPanel bare />
            </aside>
          )}

          <div className="w-full lg:w-auto flex-1 min-w-0 flex flex-col gap-6">
            <VehicleGrid
              vehicles={vehicles}
              isLoading={isLoading}
              isError={isError}
              error={error}
              onRetry={refetch}
              onClearFilters={handleClearFilters}
              hasMore={hasMore}
              onLoadMore={loadMore}
              loadingMore={loadingMore}
            />
          </div>
        </div>
      </div>
      </PageWrapper>
    </>
  );
}
