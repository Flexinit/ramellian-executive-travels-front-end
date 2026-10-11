import React, { useMemo, useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import VehicleGrid from '../components/vehicles/VehicleGrid';
import { useVehicles } from '../hooks/useVehicles';
import { VEHICLE_TIERS } from '../lib/constants';
import SegmentedControl from '../components/ui/SegmentedControl';

const PAGE_SIZE = 9;

const TABS = [
  { value: '', label: 'All Vehicles' },
  { value: VEHICLE_TIERS.STANDARD, label: 'Standard' },
  { value: VEHICLE_TIERS.EXECUTIVE, label: 'Executive' },
];

/**
 * Browse-mode fleet page — no date commitment, just look around
 * (docs/requirements.md PUB-03). Unlike VehiclesPage, it doesn't take a
 * date range or the full filter panel; the tier tab filters client-side
 * since the search endpoint's `tier` param support isn't confirmed
 * (see useVehicles.js).
 */
export default function FleetPage() {
  const [tier, setTier] = useState('');
  const { data, isLoading, isError, error, refetch } = useVehicles();
  const vehicles = Array.isArray(data) ? data : data?.content || [];

  const filtered = useMemo(
    () => (tier ? vehicles.filter((v) => v.tier === tier) : vehicles),
    [vehicles, tier]
  );

  return (
    <PageWrapper>
      <PageTitle title="Our Fleet" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">Our Fleet</h1>
          <p className="text-brand-grey text-sm mt-1">
            Browse every vehicle we offer &mdash; pick your dates when you&apos;re ready to book.
          </p>
        </div>

        <SegmentedControl
          kind="tab"
          size="sm"
          label="Filter by vehicle tier"
          className="self-start"
          options={TABS}
          value={tier}
          onChange={setTier}
        />

        <h2 className="sr-only">Available Vehicles</h2>
        <VehicleGrid
          vehicles={filtered}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
          onClearFilters={tier ? () => setTier('') : undefined}
          pageSize={PAGE_SIZE}
          resetKey={tier}
        />
      </div>
    </PageWrapper>
  );
}
