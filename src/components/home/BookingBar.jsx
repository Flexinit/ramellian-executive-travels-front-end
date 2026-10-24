import React, { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, LocateFixed, Loader2, Search, Plus, Minus } from 'lucide-react';
import DateRangePicker, {
  DEFAULT_START_TIME,
  DEFAULT_END_TIME,
  combineDateAndTime,
} from '../forms/DateRangePicker';
import { buildQueryString } from '../../lib/utils';
import { BOOKING_MODES } from '../../lib/constants';
import SegmentedControl from '../ui/SegmentedControl';
import { SelfDriveIcon, ChauffeurIcon } from '../ui/TripModeIcons';
import Button from '../ui/Button';

/** Wraps the callback-based Geolocation API in a promise. */
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
    });
  });
}

/** Reverse-geocodes coordinates to a short place name via OpenStreetMap Nominatim (no API key required). */
async function reverseGeocode(latitude, longitude) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) throw new Error('geocode-failed');
  const data = await res.json();
  const a = data.address || {};
  return a.suburb || a.neighbourhood || a.city_district || a.town || a.city || data.display_name;
}

/**
 * A single compact, icon-led field within the search bar.
 * Deliberately not the standalone `Input` widget — this needs a tighter,
 * label-inline layout to read as one continuous search bar.
 *
 * `renderInput` receives the generated id so the label stays associated
 * with the actual `<input>` even when it's nested inside extra markup
 * (e.g. a location field's "use current location" button).
 */
function BarField({ icon: Icon, label, renderInput, className = '' }) {
  const id = useId();
  return (
    <div className={`flex-1 min-w-0 flex items-center gap-2.5 px-4 sm:px-5 py-3 text-left ${className}`}>
      <Icon size={16} className="text-accent shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wider text-ink">
          {label}
        </label>
        {renderInput(id)}
      </div>
    </div>
  );
}

const fieldInputClass =
  'w-full bg-transparent border-0 p-0 text-sm text-ink placeholder-muted focus:outline-none focus:ring-0 [color-scheme:light]';

/** A text field with an inline "use current location" button, shared by pickup and return. */
function LocationField({ id, value, onChange, placeholder, locating, onLocate }) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={fieldInputClass}
      />
      <button
        type="button"
        onClick={onLocate}
        disabled={locating}
        aria-label="Use my current location"
        title="Use my current location"
        className="shrink-0 p-1 -m-1 rounded-full text-muted hover:text-accent transition-colors focus-ring disabled:opacity-60"
      >
        {locating ? (
          <Loader2 size={15} className="animate-spin" aria-hidden="true" />
        ) : (
          <LocateFixed size={15} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

const Divider = () => (
  <>
    <div className="hidden lg:block w-px my-2.5 bg-black/10" aria-hidden="true" />
    <div className="block lg:hidden h-px mx-4 bg-black/10" aria-hidden="true" />
  </>
);

/**
 * otto.rentals-style unified search widget: one continuous pill-shaped bar,
 * icon-led fields with inline micro-labels, not a stacked form. Order is
 * Return Location → Pick-up Location → dates → submit. Encodes into
 * `/vehicles` URL params on submit per FRONTEND_INTEGRATION.md §2.
 *
 * Note: the backend search API only documents a single `location` filter
 * (FRONTEND_INTEGRATION.md §2) — there's no `returnLocation` filter yet, so
 * a different return point doesn't affect search results today. It's still
 * captured and sent as `returnLocation` so it isn't silently dropped, ready
 * for the booking flow (or a future search filter) to pick up — the vehicle's booking form now starts with
 * it as the drop-off place (see bookingStore's `search`).
 */
export default function BookingBar() {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [returnLocation, setReturnLocation] = useState('');
  // Most people return the car where they got it, so the bar asks for one place; a second box for returning
  // somewhere else appears only when asked for (and is emptied if they change their mind).
  const [returnElsewhere, setReturnElsewhere] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
    startTime: DEFAULT_START_TIME,
    endTime: DEFAULT_END_TIME,
  });
  const [mode, setMode] = useState(BOOKING_MODES.SELF_DRIVE);
  const [locating, setLocating] = useState(false);
  const [locatingReturn, setLocatingReturn] = useState(false);

  async function useCurrentLocation(setValue, setLoading) {
    setLoading(true);
    try {
      const position = await getCurrentPosition();
      const name = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      if (!name) throw new Error('no-name');
      setValue(name);
    } catch (err) {
      toast.error(
        err?.code === 1
          ? 'Location access denied — enter it manually.'
          : 'Could not detect your location — enter it manually.'
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const start = combineDateAndTime(dateRange.startDate, dateRange.startTime);
    const end = combineDateAndTime(dateRange.endDate, dateRange.endTime);
    const query = buildQueryString({
      location: location || undefined,
      returnLocation: returnLocation || undefined,
      startTime: start ? start.toISOString() : undefined,
      endTime: end ? end.toISOString() : undefined,
      selfDrive: mode === BOOKING_MODES.SELF_DRIVE ? 'true' : undefined,
      chauffeured: mode === BOOKING_MODES.CHAUFFEURED ? 'true' : undefined,
    });
    // Marked as a real search, so Browse Vehicles keeps these choices rather than clearing them the way it
    // does for a stale bookmark or an earlier visit's URL.
    navigate(`/vehicles${query}`, { state: { fromSearch: true } });
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Search vehicles" className="w-full flex flex-col gap-3">
      <SegmentedControl
        label="Booking mode"
        size="sm"
        className="self-center sm:self-start"
        options={[
          { value: BOOKING_MODES.SELF_DRIVE, label: 'Self-Drive', icon: SelfDriveIcon },
          { value: BOOKING_MODES.CHAUFFEURED, label: 'Chauffeured', icon: ChauffeurIcon },
        ]}
        value={mode}
        onChange={setMode}
      />

      <div className="w-full bg-surface border border-black/10 rounded-2xl lg:rounded-full shadow-card flex flex-col lg:flex-row lg:items-stretch">
        <BarField
          icon={MapPin}
          label="Pick-up Location"
          renderInput={(id) => (
            <LocationField
              id={id}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where? e.g. JKIA Terminal 1"
              locating={locating}
              onLocate={() => useCurrentLocation(setLocation, setLocating)}
            />
          )}
        />

        <Divider />

        {returnElsewhere && (
          <>
            <BarField
              icon={MapPin}
              label="Return Location"
              renderInput={(id) => (
                <LocationField
                  id={id}
                  value={returnLocation}
                  onChange={(e) => setReturnLocation(e.target.value)}
                  placeholder="e.g. Diani Beach"
                  locating={locatingReturn}
                  onLocate={() => useCurrentLocation(setReturnLocation, setLocatingReturn)}
                />
              )}
            />

            <Divider />
          </>
        )}

        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          className="flex-[1.4] min-w-0 px-4 sm:px-5 py-3"
        />

        <div className="p-2 lg:pl-0 flex items-center justify-center">
          <Button type="submit" size="icon" aria-label="Search vehicles" className="w-full lg:w-12">
            <Search size={18} aria-hidden="true" />
            <span className="lg:hidden">Search Vehicles</span>
          </Button>
        </div>
      </div>

      <button
        type="button"
        aria-expanded={returnElsewhere}
        onClick={() => {
          if (returnElsewhere) setReturnLocation('');
          setReturnElsewhere(!returnElsewhere);
        }}
        className="self-center sm:self-start inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.45)] focus-ring rounded-md px-1"
      >
        {returnElsewhere ? <Minus size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
        {returnElsewhere ? 'Return to the same place' : 'Return to a different location'}
      </button>
    </form>
  );
}
