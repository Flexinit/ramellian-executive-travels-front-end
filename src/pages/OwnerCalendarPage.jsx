import React, { useMemo, useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import BookingCalendar from '../components/vehicles/BookingCalendar';
import { useMyVehicles } from '../hooks/useVehicles';
import { useOwnerBookings } from '../hooks/useBookings';
import { bookedPeriods } from '../lib/vehicleBookings';
import { CalendarDays } from 'lucide-react';

const ALL_VEHICLES = '';

/**
 * Every vehicle in the fleet laid out as one calendar — "All vehicles" merges each vehicle's own booked
 * periods (`lib/vehicleBookings.js`'s `bookedPeriods`, the same helper My Vehicles already uses) tagged with
 * its model name, so a day with more than one vehicle out shows a dot per vehicle and names each one when
 * clicked; picking one vehicle from the filter narrows the same calendar down to just its own bookings.
 */
export default function OwnerCalendarPage() {
  const { vehicles, isLoading: vehiclesLoading, isError: vehiclesError, refetch: refetchVehicles } = useMyVehicles();
  const { data: ownerBookings, isLoading: bookingsLoading, isError: bookingsError, refetch: refetchBookings } = useOwnerBookings();
  const [vehicleId, setVehicleId] = useState(ALL_VEHICLES);

  const isLoading = vehiclesLoading || bookingsLoading;
  const isError = vehiclesError || bookingsError;

  const periods = useMemo(() => {
    const targets = vehicleId ? vehicles.filter((v) => v.id === vehicleId) : vehicles;
    return targets.flatMap((v) =>
      bookedPeriods(ownerBookings, v.id).map((p) => ({ ...p, vehicleModel: v.model, vehicleColor: v.color }))
    );
  }, [vehicles, ownerBookings, vehicleId]);

  const vehicleOptions = vehicles.map((v) => ({ value: v.id, label: v.model }));

  return (
    <PageWrapper>
      <PageTitle title="Booking Calendar" />
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">Booking Calendar</h1>
          {vehicleOptions.length > 1 && (
            <Select
              label="Vehicle"
              name="vehicle"
              options={vehicleOptions}
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              placeholder="All vehicles"
              className="w-full sm:w-56"
            />
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" label="Loading your bookings" />
          </div>
        ) : isError ? (
          <ErrorBanner
            message="Could not load your fleet's bookings."
            onRetry={() => {
              refetchVehicles();
              refetchBookings();
            }}
          />
        ) : vehicles.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No vehicles yet"
            description="Once you've listed a vehicle, its bookings show up here."
          />
        ) : (
          <Card className="p-5 max-w-md">
            <BookingCalendar periods={periods} />
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
