import React from 'react';
import { Car, Plus } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import OwnerVehicleCard from '../components/vehicles/OwnerVehicleCard';
import { useMyVehicles, useSetVehicleAvailability } from '../hooks/useVehicles';
import { useOwnerBookings } from '../hooks/useBookings';
import { bookedPeriods } from '../lib/vehicleBookings';
import Button from '../components/ui/Button';
import Pagination from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';

/**
 * "My Vehicles" — every vehicle the signed-in owner has added, whether or not
 * renters can see it yet, each with the dates it is booked. See `useMyVehicles`
 * for how "mine" is derived (there's no dedicated backend endpoint), and
 * lib/vehicleBookings.js for the booked dates. Each vehicle has a one-click
 * availability switch (`useSetVehicleAvailability`, `PUT /vehicles/{id}`).
 */
export default function OwnerVehiclesPage() {
  const { vehicles, isLoading, isError, refetch } = useMyVehicles();
  const { data: ownerBookings } = useOwnerBookings();
  const setAvailability = useSetVehicleAvailability();
  const pages = usePagination(vehicles, 9);

  return (
    <PageWrapper>
      <PageTitle title="My Vehicles" />
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">My Vehicles</h1>
            <p className="text-brand-grey text-sm mt-1">
              All your vehicles, whether or not renters can see them. Use the switch to pull one from renters — or put it back — in one click.
            </p>
          </div>
          <Button
            to="/owner/vehicles/new"
          >
            <Plus size={15} aria-hidden="true" />
            Add Vehicle
          </Button>
        </div>

        {isError && <ErrorBanner message="We couldn't load your vehicles just now. Please try again." onRetry={refetch} />}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-5">
                <Skeleton className="w-full h-28" />
              </Card>
            ))}
          </div>
        ) : vehicles.length > 0 ? (
          <>
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-label="Your vehicles">
            {pages.pageItems.map((vehicle) => (
              <li key={vehicle.id} className="flex flex-col">
                <OwnerVehicleCard
                  vehicle={vehicle}
                  editTo={`/owner/vehicles/${vehicle.id}/edit`}
                  bookings={bookedPeriods(ownerBookings, vehicle.id)}
                  onToggleAvailable={(v, available) => setAvailability.mutate({ vehicle: v, available })}
                  togglePending={setAvailability.isPending && setAvailability.variables?.vehicle?.id === vehicle.id}
                  headingLevel="h2"
                />
              </li>
            ))}
          </ul>
          <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} noun="vehicles" />
          </>
        ) : (
          !isError && (
            <Card>
              <EmptyState
                icon={Car}
                title="No vehicles yet"
                description="Add your first vehicle and it will show up here."
              />
            </Card>
          )
        )}
      </div>
    </PageWrapper>
  );
}
