import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Car, ArrowRight, ListChecks, BarChart3, IdCard } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import ErrorBanner from '../components/ui/ErrorBanner';
import Spinner from '../components/ui/Spinner';
import StepIndicator from '../components/ui/StepIndicator';
import OwnerProfileForm from '../components/profile/OwnerProfileForm';
import { useCurrentUser } from '../hooks/useProfile';
import OwnerVehicleCard from '../components/vehicles/OwnerVehicleCard';
import { useMyVehicles, useSetVehicleAvailability } from '../hooks/useVehicles';
import { useDocuments } from '../hooks/useDocuments';
import { missingRequiredDocuments } from '../lib/documents';
import Button from '../components/ui/Button';

const STEPS = [{ label: 'Profile' }, { label: 'Identity' }, { label: 'Vehicle' }];

/**
 * First stop for owners/managers at `/owner` — a step-by-step setup guide
 * until they've completed their profile, verified their identity, and
 * listed at least one vehicle with photos, then the normal fleet overview.
 * "Do they have a vehicle yet" is answered by the backend's own
 * `hasAddedVehicleToProfile` flag on `GET /users/me`, falling back to
 * `useMyVehicles` (there's no `GET /vehicles/mine` endpoint, so that hook
 * filters the public list by `ownerEmail`) — the flag also covers vehicles
 * that list doesn't return, e.g. ones marked unavailable.
 *
 * Identity verification reuses the same `GET /documents` data as the
 * renter-facing DocumentsPage / checkout document gate (FRONTEND_INTEGRATION.md
 * §3) — a national ID or passport upload satisfies this step regardless of
 * approval status, since approval is an async backend review and shouldn't
 * block an owner from seeing the rest of onboarding; a REJECTED document
 * does NOT count, so the owner is routed back to re-upload it.
 */
export default function OwnerDashboardPage() {
  const { data: currentUser, isLoading: profileLoading } = useCurrentUser();
  const {
    vehicles: myVehicles,
    isLoading: vehiclesLoading,
    isError: vehiclesError,
    refetch: refetchVehicles,
  } = useMyVehicles();
  const setAvailability = useSetVehicleAvailability();
  const {
    data: documents,
    isLoading: documentsLoading,
    isError: documentsError,
    refetch: refetchDocuments,
  } = useDocuments();

  const profileComplete = !!currentUser?.ownerType;
  const documentComplete = Array.isArray(documents)
    ? missingRequiredDocuments(documents).length === 0
    : false;
  const vehicleComplete = currentUser?.hasAddedVehicleToProfile === true || myVehicles.length > 0;

  if (profileLoading || vehiclesLoading || documentsLoading) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" label="Loading your dashboard" />
      </PageWrapper>
    );
  }

  if (profileComplete && documentComplete && vehicleComplete) {
    return (
      <PageWrapper>
        <PageTitle title="Owner Dashboard" />
        <div className="flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">
                Welcome{currentUser?.firstName ? `, ${currentUser.firstName}` : ''}
              </h1>
              <Badge label="Car Owner" variant="gold" />
            </div>
            <p className="text-brand-grey text-sm mt-1">Here's an overview of your fleet.</p>
          </div>

          <Card className="p-5 flex items-center gap-4 w-fit">
            <div className="w-11 h-11 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
              <Car size={20} className="text-brand-gold" aria-hidden="true" />
            </div>
            <div>
              <p className="text-brand-grey text-xs">Vehicles Listed</p>
              <p className="font-heading text-brand-white text-2xl font-bold">{myVehicles.length}</p>
            </div>
          </Card>

          {myVehicles.length > 0 && (
            <section aria-labelledby="my-vehicles-heading" className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h2 id="my-vehicles-heading" className="font-heading text-brand-white text-lg font-semibold">
                  My Vehicles
                </h2>
                <Link
                  to="/owner/vehicles"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-gold hover:text-brand-gold-light transition-colors focus-ring rounded-md"
                >
                  View all
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myVehicles.slice(0, 3).map((vehicle) => (
                  <li key={vehicle.id} className="flex flex-col">
                    <OwnerVehicleCard
                      vehicle={vehicle}
                      onToggleAvailable={(v, available) => setAvailability.mutate({ vehicle: v, available })}
                      togglePending={setAvailability.isPending && setAvailability.variables?.vehicle?.id === vehicle.id}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              to="/owner/vehicles/new"
            >
              <Car size={15} aria-hidden="true" />
              Add Another Vehicle
            </Button>
            <Button to="/owner/bookings">
              <ListChecks size={15} aria-hidden="true" />
              Fleet Bookings
            </Button>
            <Button to="/owner/reports">
              <BarChart3 size={15} aria-hidden="true" />
              Reports
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const currentStep = !profileComplete ? 0 : !documentComplete ? 1 : 2;

  return (
    <PageWrapper className="max-w-xl mx-auto">
      <PageTitle title="Owner Dashboard" />
      <div className="flex flex-col gap-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2.5 flex-wrap">
            <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">Let's get your fleet set up</h1>
            <Badge label="Car Owner" variant="gold" />
          </div>
          <p className="text-brand-grey text-sm mt-1">A few quick steps and your first vehicle will be live.</p>
        </div>

        <StepIndicator steps={STEPS} currentStep={currentStep} />

        {(documentsError || vehiclesError) && (
          <ErrorBanner
            message="We couldn't check your identity document or vehicle status just now (a server error) — a step below may show as incomplete even if you already did it. Try again in a moment."
            onRetry={() => {
              if (documentsError) refetchDocuments();
              if (vehiclesError) refetchVehicles();
            }}
          />
        )}

        {!profileComplete && (
          <Card className="p-6 sm:p-8 flex flex-col gap-5">
            <div>
              <h2 className="font-heading text-brand-white text-lg font-semibold">Complete Your Profile</h2>
              <p className="text-brand-grey text-sm mt-1">Choose Individual or Business and we'll ask for the details that match.</p>
            </div>
            <OwnerProfileForm submitLabel="Save & Continue" />
          </Card>
        )}

        {profileComplete && !documentComplete && (
          <Card className="p-6 sm:p-8 flex flex-col items-center text-center gap-4">
            <CheckCircle2 size={28} className="text-emerald-400" aria-hidden="true" />
            <div>
              <h2 className="font-heading text-brand-white text-lg font-semibold">Profile complete</h2>
              <p className="text-brand-grey text-sm mt-1">
                Next — verify your identity by uploading a National ID or passport so renters
                can trust your listings. Businesses can add a registration or tax certificate too, if they have one.
              </p>
            </div>
            <Button
              to="/dashboard/documents"
            >
              <IdCard size={15} aria-hidden="true" />
              Verify Your Identity
              <ArrowRight size={15} aria-hidden="true" />
            </Button>
          </Card>
        )}

        {profileComplete && documentComplete && !vehicleComplete && (
          <Card className="p-6 sm:p-8 flex flex-col items-center text-center gap-4">
            <CheckCircle2 size={28} className="text-emerald-400" aria-hidden="true" />
            <div>
              <h2 className="font-heading text-brand-white text-lg font-semibold">Identity verified</h2>
              <p className="text-brand-grey text-sm mt-1">
                Last step — add your first vehicle and upload its photos so renters can find it.
              </p>
            </div>
            <Button
              to="/owner/vehicles/new"
            >
              Add Your First Vehicle
              <ArrowRight size={15} aria-hidden="true" />
            </Button>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
