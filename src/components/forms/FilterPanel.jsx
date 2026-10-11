import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import DateRangePicker, { combineDateAndTime, DEFAULT_START_TIME, DEFAULT_END_TIME } from './DateRangePicker';
import { FUEL_TYPES, TRANSMISSION_TYPES } from '../../lib/constants';
import ToggleChip from '../ui/ToggleChip';
import RangeSlider from '../ui/RangeSlider';
import { useVehicleFacets } from '../../hooks/useVehicles';
import { isSameLocation } from '../../lib/vehicleLocations';
import { formatCurrency } from '../../lib/utils';

function titleCase(value) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const FUEL_OPTIONS = Object.values(FUEL_TYPES).map((v) => ({ value: v, label: titleCase(v) }));
const TRANSMISSION_OPTIONS = Object.values(TRANSMISSION_TYPES).map((v) => ({ value: v, label: titleCase(v) }));

function parseDateParam(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timeFromDate(date, fallback) {
  if (!date) return fallback;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Every control here writes straight to the URL — filters are shareable
 * links, not local component state. The price is a two-handle slider spanning the cheapest to the
 * dearest available vehicle, and "Available in" lists the places vehicles are available with how
 * many are in each; picking one filters to it. "Clear all" resets every param except
 * `sort` (changing sort isn't really a "filter").
 *
 * @param {boolean} [bare] — no card around it: the controls sit straight on the page, the same as the Sort by
 *   field beside the results (the wide-screen column). Left off, it's a frosted-glass card — needed where it
 *   opens over the cars (the narrow-screen Filters button), so its labels stay readable.
 */
export default function FilterPanel({ bare = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { locations, priceBounds } = useVehicleFacets();
  const selectedLocation = searchParams.get('location') || '';
  // The slider always has room for the range in the link, even before the vehicles (and so the real range) have loaded.
  const urlMin = Number(searchParams.get('minPrice')) || 0;
  const urlMax = Number(searchParams.get('maxPrice')) || 0;
  const sliderMax = Math.max(priceBounds.max, urlMax, urlMin);

  function updateParams(updates) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(updates).forEach(([key, value]) => {
          if (value === undefined || value === null || value === '') next.delete(key);
          else next.set(key, value);
        });
        return next;
      },
      { replace: true }
    );
  }

  const startDate = parseDateParam(searchParams.get('startTime'));
  const endDate = parseDateParam(searchParams.get('endTime'));
  const dateRange = {
    startDate,
    endDate,
    startTime: timeFromDate(startDate, DEFAULT_START_TIME),
    endTime: timeFromDate(endDate, DEFAULT_END_TIME),
  };

  function handleDateRangeChange(next) {
    const start = combineDateAndTime(next.startDate, next.startTime);
    const end = combineDateAndTime(next.endDate, next.endTime);
    updateParams({
      startTime: start ? start.toISOString() : undefined,
      endTime: end ? end.toISOString() : undefined,
    });
  }

  const hasFilters = [...searchParams.keys()].some((k) => k !== 'sort');

  function handleClearAll() {
    const sort = searchParams.get('sort');
    const next = new URLSearchParams();
    if (sort) next.set('sort', sort);
    setSearchParams(next, { replace: true });
  }

  return (
    <div
      className={`flex flex-col gap-3 ${
        bare ? '' : 'bg-brand-navy/50 backdrop-blur-md shadow-lg shadow-black/20 border border-white/15 rounded-2xl p-5'
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-brand-white text-sm font-semibold inline-flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-brand-gold" aria-hidden="true" />
          Filters
        </h2>
        {hasFilters && (
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1 text-xs text-brand-grey hover:text-brand-white transition-colors focus-ring rounded-md"
          >
            <X size={12} aria-hidden="true" />
            Clear all
          </button>
        )}
      </div>

      <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />

      <div role="group" aria-label="Booking mode" className="flex gap-2">
        {[
          { key: 'selfDrive', label: 'Self-Drive' },
          { key: 'chauffeured', label: 'Chauffeured' },
        ].map((opt) => {
          const active = searchParams.get(opt.key) === 'true';
          return (
            <ToggleChip
              key={opt.key}
              active={active}
              onClick={() => updateParams({ [opt.key]: active ? undefined : 'true' })}
              className="flex-1"
            >
              {opt.label}
            </ToggleChip>
          );
        })}
      </div>

      {locations.length > 0 && (
        <div role="group" aria-label="Available in" className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-brand-white">Available in</span>
          <div className="flex flex-wrap gap-1.5">
            {locations.map((place) => {
              const active = isSameLocation(place.name, selectedLocation);
              return (
                <ToggleChip
                  key={place.name}
                  active={active}
                  onClick={() => updateParams({ location: active ? undefined : place.name })}
                >
                  {place.name} <span className={active ? 'text-brand-gold/80' : 'text-brand-white/70'}>({place.count})</span>
                </ToggleChip>
              );
            })}
          </div>
        </div>
      )}

      {/* No separate "Search a location" box: the place chips above and the main search box (which
          searches by location too) already cover it, and it made this column taller than the screen. */}
      <RangeSlider
        label="Price per day"
        min={priceBounds.min}
        max={sliderMax}
        step={priceBounds.step}
        format={formatCurrency}
        value={{
          min: Math.max(urlMin || priceBounds.min, priceBounds.min),
          max: Math.min(urlMax || sliderMax, sliderMax),
        }}
        onCommit={({ min, max }) =>
          updateParams({
            // Left at the ends of the slider means "no limit", so the param is dropped rather than pinned.
            minPrice: min > priceBounds.min ? min : undefined,
            maxPrice: max < sliderMax ? max : undefined,
          })
        }
      />

      {/* Two to a row, so the whole column fits on screen without scrolling. */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Minimum Seats"
          name="capacity"
          type="number"
          min="1"
          placeholder="Any"
          defaultValue={searchParams.get('capacity') || ''}
          onBlur={(e) => updateParams({ capacity: e.target.value })}
        />

        <Select
          label="Fuel Type"
          name="fuelType"
          placeholder="Any"
          options={FUEL_OPTIONS}
          value={searchParams.get('fuelType') || ''}
          onChange={(e) => updateParams({ fuelType: e.target.value })}
        />

        <Select
          label="Transmission"
          name="transmissionType"
          placeholder="Any"
          options={TRANSMISSION_OPTIONS}
          value={searchParams.get('transmissionType') || ''}
          onChange={(e) => updateParams({ transmissionType: e.target.value })}
        />
      </div>
    </div>
  );
}
