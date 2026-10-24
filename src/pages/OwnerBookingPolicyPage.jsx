import React from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import BookingPolicyForm from '../components/booking/BookingPolicyForm';
import { useOwnerPolicy, usePlatformPolicy, useSaveOwnerPolicy } from '../hooks/useBookingPolicies';

/**
 * An owner's own cancellation and postponement rules for their bookings (`GET`/`PUT /booking-policies/owner`).
 * Until they save one, their bookings follow the platform's default (`GET /booking-policies/platform`), which
 * the form starts from. Saved rules apply to bookings made from then on — each booking keeps the policy it was
 * made under (the contract quotes it).
 */
export default function OwnerBookingPolicyPage() {
  const own = useOwnerPolicy();
  const platform = usePlatformPolicy();
  const save = useSaveOwnerPolicy();
  const hasOwn = !!own.data && !own.isError;
  const loading = own.isLoading || (!hasOwn && platform.isLoading);

  return (
    <PageWrapper className="max-w-3xl">
      <PageTitle title="Booking Policy" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Booking Policy</h1>
          <p className="text-muted text-sm mt-1.5">
            When renters can cancel and get their money back, and whether they can move their dates. It applies to
            bookings made from now on, and it's written into each rental contract.
          </p>
        </div>

        {!hasOwn && !loading && (
          <p className="text-sm text-ink rounded-xl bg-accent/10 border border-accent/20 px-4 py-3">
            You haven't set your own policy, so your bookings follow the platform's standard one, shown below. Change
            anything and save to make it yours.
          </p>
        )}

        <Card className="p-5 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner label="Loading your booking policy" />
            </div>
          ) : (
            <BookingPolicyForm policy={hasOwn ? own.data : platform.data} onSave={(policy) => save.mutate(policy)} saving={save.isPending} />
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}
