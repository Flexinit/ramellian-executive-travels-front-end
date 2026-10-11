import React, { useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import VehicleCard from '../vehicles/VehicleCard';
import VehicleCardSkeleton from '../vehicles/VehicleCardSkeleton';
import Button from '../ui/Button';
import { useVehicleAvailability } from '../../hooks/useVehicles';

const MAX_CARDS = 10;

/**
 * One swipeable row of real vehicles on the home page — `filters` go straight to `GET /vehicles`, the same
 * as Browse Vehicles, in the same "Recommended" order. Scrolls sideways (swipe on a phone, the arrow buttons
 * on a wider screen) and snaps card by card. Shows at most 10; "See all" opens Browse Vehicles with the same
 * filters, marked `fromSearch` so that page keeps them. A row with nothing in it (or that failed to load)
 * isn't shown at all, rather than an empty strip on the landing page.
 *
 * @param {string} title
 * @param {Record<string, string|boolean>} [filters]
 */
export default function VehicleRow({ title, filters = {} }) {
  const { vehicles, isLoading, isError } = useVehicleAvailability(filters);
  const scroller = useRef(null);
  const headingId = useId();

  if (isError || (!isLoading && vehicles.length === 0)) return null;

  const shown = vehicles.slice(0, MAX_CARDS);
  const query = new URLSearchParams(Object.entries(filters).map(([k, v]) => [k, String(v)])).toString();

  function scrollBy(direction) {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 id={headingId} className="font-heading text-brand-white text-lg sm:text-xl font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <Button size="icon" onClick={() => scrollBy(-1)} aria-label={`Scroll ${title} left`}>
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
            <Button size="icon" onClick={() => scrollBy(1)} aria-label={`Scroll ${title} right`}>
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </div>
          <Link
            to={`/vehicles${query ? `?${query}` : ''}`}
            state={{ fromSearch: true }}
            className="focus-ring rounded-md inline-flex items-center gap-1 text-sm text-brand-gold hover:underline"
          >
            See all <span className="sr-only">{title}</span> <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <ul
        ref={scroller}
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-3 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="snap-start shrink-0 w-[80%] sm:w-72">
                <VehicleCardSkeleton />
              </li>
            ))
          : shown.map((vehicle) => (
              <li key={vehicle.id} className="snap-start shrink-0 w-[80%] sm:w-72 flex">
                <div className="w-full">
                  <VehicleCard vehicle={vehicle} />
                </div>
              </li>
            ))}
      </ul>
    </section>
  );
}
