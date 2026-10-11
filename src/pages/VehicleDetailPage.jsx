import React from 'react';
import { Link, useParams } from 'react-router-dom';
import ImageGallery from '../components/vehicles/ImageGallery';
import VehicleInfoPanel from '../components/vehicles/VehicleInfoPanel';
import PageWrapper from '../components/layout/PageWrapper';
import PageBackdrop from '../components/layout/PageBackdrop';
import PageTitle from '../components/layout/PageTitle';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import BackLink from '../components/ui/BackLink';
import AddToBookingPanel from '../components/booking/AddToBookingPanel';
import AvailabilitySwitch from '../components/vehicles/AvailabilitySwitch';
import ReviewList from '../components/reviews/ReviewList';
import { useVehicleReviews } from '../hooks/useReviews';
import { USER_ROLES } from '../lib/constants';
import { useSetVehicleAvailability, useVehicle } from '../hooks/useVehicles';
import { useAuthStore } from '../store/authStore';
import { isOwnVehicle } from '../lib/vehicleOptions';
import dianiReefResort from '../assets/destinations/diani-reef-resort.jpg';

export default function VehicleDetailPage() {
  const { vehicleId } = useParams();
  const { data: vehicle, isLoading, isError, error, refetch } = useVehicle(vehicleId);
  const user = useAuthStore((s) => s.user);
  const setAvailability = useSetVehicleAvailability();
  const reviews = useVehicleReviews(vehicleId);

  if (isLoading) {
    return (
      <PageBackdrop image={dianiReefResort}>
        <PageWrapper className="flex items-center justify-center min-h-[50vh]">
          <Spinner size="lg" label="Loading vehicle" />
        </PageWrapper>
      </PageBackdrop>
    );
  }

  if (isError || !vehicle) {
    return (
      <PageBackdrop image={dianiReefResort}>
        <PageWrapper>
          <BackLink to="/vehicles" label="Back to vehicles" className="mb-3" />
          <ErrorBanner
            message={error?.response?.data?.message || 'Could not load this vehicle. It may no longer be available.'}
            onRetry={refetch}
          />
        </PageWrapper>
      </PageBackdrop>
    );
  }

  return (
    <PageBackdrop image={dianiReefResort}>
      <PageWrapper className="!pt-6 lg:!pt-8">
      <PageTitle title="Vehicle Details" />
      <BackLink to="/vehicles" label="Back to vehicles" className="mb-3" />
      {/* Photos and the read-only details share the wide column, since they're read top to bottom like an
          article; the booking form is a sticky sidebar next to them, the way a listing page's "book this"
          widget stays in view while you read — not squeezed into the same narrow column as the details,
          which is what forced this whole page into one long scroll. */}
      {/* `min-w-0` on both columns: a grid column otherwise grows to its content's natural width, so a large
          photo pushed the gallery past the right edge (its Next arrow and photo count were cut off). */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 lg:gap-12 items-start">
        {/* Photo and details side by side (stacked on a phone), with Reviews right under them, so the whole
            vehicle — photo, name, features, price and reviews — fits on one screen without scrolling. */}
        <div className="flex flex-col gap-6 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6 md:gap-10 items-start">
            <div className="min-w-0">
              <ImageGallery photos={vehicle.photos} alt={vehicle.model} tier={vehicle.tier} />
            </div>
            <div className="min-w-0">
              <VehicleInfoPanel vehicle={vehicle} isOwner={isOwnVehicle(vehicle, user)} />
            </div>
          </div>

          <section aria-labelledby="reviews-heading" className="flex flex-col gap-3 pt-6 border-t border-white/10">
            <h2 id="reviews-heading" className="font-heading text-brand-white text-lg font-bold">
              Reviews
            </h2>
            <ReviewList reviews={reviews.data} isLoading={reviews.isLoading} showComplaints={(user?.roles || []).includes(USER_ROLES.ADMIN)} emptyText="No reviews yet" />
          </section>
        </div>

        <div className="lg:sticky lg:top-24 min-w-0">
          {isOwnVehicle(vehicle, user) ? (
            <div role="note" className="rounded-xl bg-brand-gold/10 border border-brand-gold/20 px-4 py-3 text-sm text-brand-white flex flex-col gap-3">
              <p>This is your vehicle, so you can't book it.</p>
              {typeof vehicle.available === 'boolean' && (
                <AvailabilitySwitch
                  available={vehicle.available}
                  pending={setAvailability.isPending}
                  onToggle={(next) => setAvailability.mutate({ vehicle, available: next })}
                />
              )}
              <Link to="/owner/vehicles" className="text-brand-gold hover:text-brand-gold-light font-semibold focus-ring rounded-md w-fit">
                Manage it in My Vehicles
              </Link>
            </div>
          ) : vehicle.available === false ? (
            <div role="note" className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-brand-grey">
              This vehicle isn't available for booking right now.
            </div>
          ) : (
            <AddToBookingPanel vehicle={vehicle} />
          )}
        </div>
      </div>

      </PageWrapper>
    </PageBackdrop>
  );
}
