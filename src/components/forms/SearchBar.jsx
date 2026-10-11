import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SEARCH_DEBOUNCE_MS } from '../../lib/constants';

/**
 * Free-text search — debounces input before writing to the `query` URL
 * param so `useVehicles` doesn't re-fetch on every keystroke.
 */
export default function SearchBar({ placeholder = 'Search by model, location, fuel type…' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [value, setValue] = useState(searchParams.get('query') || '');

  // The debounce timer fires long after the render that started it, so it must read the URL as it is THEN
  // (a filter picked in the meantime would otherwise be wiped by writing back a stale copy).
  const latestParams = useRef(searchParams);
  latestParams.current = searchParams;

  useEffect(() => {
    const handle = setTimeout(() => {
      const current = latestParams.current;
      // Nothing to write when the box already matches the URL (e.g. on first load).
      if ((current.get('query') || '') === value) return;
      const next = new URLSearchParams(current);
      if (value) next.set('query', value);
      else next.delete('query');
      setSearchParams(next, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      {/* z-10: the input's backdrop blur paints it as its own layer, which would otherwise cover the icon. */}
      <Search size={16} className="absolute z-10 left-4 top-1/2 -translate-y-1/2 text-brand-grey pointer-events-none" aria-hidden="true" />
      <input
        type="text"
        role="searchbox"
        aria-label="Search vehicles"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full bg-white/5 backdrop-blur-lg border border-white/10 hover:border-brand-gold/50 pl-10 pr-4 py-3 text-sm text-brand-white placeholder-brand-grey/60 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent transition"
      />
    </div>
  );
}
