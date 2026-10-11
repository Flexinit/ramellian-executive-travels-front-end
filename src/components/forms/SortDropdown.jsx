import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Select from '../ui/Select';
import { SORT_OPTIONS } from '../../lib/constants';

/** Changes the `sort` URL param; the select's value reflects the active option. */
export default function SortDropdown() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = searchParams.get('sort') || 'recommended';

  function handleChange(e) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('sort', e.target.value);
        return next;
      },
      { replace: true }
    );
  }

  return (
    <Select
      label="Sort by"
      name="sort"
      options={SORT_OPTIONS}
      value={sort}
      onChange={handleChange}
      className="w-full sm:w-56"
    />
  );
}
