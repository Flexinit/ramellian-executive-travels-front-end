import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { MapPin, SlidersHorizontal } from 'lucide-react';
import Button from '../components/ui/Button';
import SearchBar from '../components/forms/SearchBar';
import FilterPanel from '../components/forms/FilterPanel';
import SortDropdown from '../components/forms/SortDropdown';
import VehicleGrid from '../components/vehicles/VehicleGrid';
import PageWrapper from '../components/layout/PageWrapper';
import PageBackdrop from '../components/layout/PageBackdrop';
import PageTitle from '../components/layout/PageTitle';
import { useVehicleAvailability } from '../hooks/useVehicles';
import { useBookingStore } from '../store/bookingStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { BOOKING_MODES } from '../lib/constants';
import { groupByLocation } from '../lib/vehicleLocations';
import { DESTINATION_PHOTOS } from '../lib/destinationPhotos';

// Kept across a fresh arrival at the page — everything else (location, dates, mode, tier, fuel,
// transmission, seats, free text) is a filter and is cleared. `sort` survives alongside the price
// range for the same reason FilterPanel's own "Clear all" spares it: choosing an order isn't filtering.
const KEEP_ON_ARRIVAL = ['minPrice', 'maxPrice', 'sort'];

/**
 * Reads filters straight from the URL (shareable/bookmarkable searches) and
 * passes them to `useVehicles`. Pagination shape is assumed to be either a
 * Spring Data `Page` (`{ content: [...] }`) or a plain array — the exact
 * response shape wasn't confirmable against a reachable backend; adjust
 * the `vehicles` extraction below once verified against Swagger.
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

  const filters = Object.fromEntries(searchParams.entries());
  // The narrow-screen Filters button: whether the panel is open, and how many filters are in use (the sort
  // isn't a filter; the free-text search shows in its own box).
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Tailwind's `lg` breakpoint: where the filters become a column beside the results. Assumed wide where it
  // can't be measured (tests).
  const wide = useMediaQuery('(min-width: 1024px)', true);
  const activeFilters = [...searchParams.keys()].filter((k) => k !== 'sort' && k !== 'query').length;

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
      pickupLocation: params.get('location') || undefined,
      dropoffLocation: params.get('returnLocation') || undefined,
    });
  }, [query, setSearch]);

  const { vehicles, isLoading, isError, error, refetch } = useVehicleAvailability(filters);
  // When the results span more than one place, they're shown place by place — but only until the renter picks
  // a sort. The groups are ordered busiest place first, which overrode any sort (the 8-seat car under "Most
  // Seats" landed in the second group), so a chosen sort gets one list in exactly that order.
  const groups = groupByLocation(vehicles);
  const byLocation = !isLoading && !isError && groups.length > 1 && !searchParams.get('sort');

  function handleClearFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  return (
    <PageBackdrop images={DESTINATION_PHOTOS}>
      <PageWrapper className="!pt-6 lg:!pt-8">
      <PageTitle title="Browse Vehicles" />
      <div className="flex flex-col gap-5">
        {/* Sort by sits on the title's line rather than alone above the results, where it left a gap. */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">Browse Vehicles</h1>
            <p className="text-brand-grey text-sm mt-1">
              {isLoading ? 'Searching…' : `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} found`}
            </p>
          </div>
          <SortDropdown />
        </div>

        {/* The search and filters stay in view while the cars scroll. The search box is its own full-width
            bar pinned under the top bar (h-20), with no band behind it — the box itself is frosted glass. On a narrower screen the bar also holds the Filters button, and
            the panel opens inside the bar (scrolling on its own); on a wide screen the panel is a column beside
            the results, pinned just below the bar. One FilterPanel, placed by `wide`, so its state is never
            duplicated. */}
        <div
          role="search"
          aria-label="Search vehicles"
          className="sticky top-20 z-20 py-3 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <SearchBar />
            </div>
            {!wide && (
              <Button
                className="shrink-0"
                aria-expanded={filtersOpen}
                aria-controls="vehicle-filters"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
              </Button>
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
              className="w-72 shrink-0 self-start sticky top-[10.5rem] max-h-[calc(100vh-17rem)] overflow-y-auto"
            >
              <FilterPanel bare />
            </aside>
          )}

          <div className="w-full lg:w-auto flex-1 min-w-0 flex flex-col gap-4">
            {byLocation ? (
              groups.map((group, index) => (
                <section key={group.name} aria-labelledby={`location-heading-${index}`} className="flex flex-col gap-3">
                  <h2 id={`location-heading-${index}`} className="font-heading text-brand-white text-lg font-semibold inline-flex items-center gap-2">
                    <MapPin size={16} className="text-brand-gold" aria-hidden="true" />
                    {group.name}
                    <span className="text-brand-grey text-sm font-normal">
                      · {group.vehicles.length} vehicle{group.vehicles.length === 1 ? '' : 's'}
                    </span>
                  </h2>
                  <VehicleGrid vehicles={group.vehicles} />
                </section>
              ))
            ) : (
              <VehicleGrid
                vehicles={vehicles}
                isLoading={isLoading}
                isError={isError}
                error={error}
                onRetry={refetch}
                onClearFilters={handleClearFilters}
              />
            )}
          </div>
        </div>
      </div>
      </PageWrapper>
    </PageBackdrop>
  );
}
