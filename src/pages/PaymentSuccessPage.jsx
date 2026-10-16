import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useBooking } from '../hooks/useBookings';

/**
 * The landing page Pesapal's own redirect comes back to once someone finishes (or abandons) paying. It only
 * works out which booking that was and hands over to that booking's Payment page (`/book/:vehicleId/payment`),
 * which shows the result — paid, failed, still checking — and every next step (sign the contract, try again,
 * check again). One page for all of it, so the two can't drift apart: the "Try Again" that did nothing lived
 * in a separate copy of this logic here.
 *
 * `bookingId` comes from a `?bookingId=` query param first, falling back to the `lastCheckoutBookingId`
 * `usePesapalCheckout` stashes in sessionStorage right before redirecting to Pesapal (the redirect is a full
 * page load, which loses React Router state). The vehicle id for the Payment page's URL comes from the booking
 * record. The `checkout:{bookingId}` flag is set first so the Payment page resumes checking the payment rather
 * than offering "Proceed to Payment" again — including in a browser that never started this checkout.
 */
export default function PaymentSuccessPage() {
  const { search } = useLocation();
  const bookingId = new URLSearchParams(search).get('bookingId') || sessionStorage.getItem('lastCheckoutBookingId');
  const { data: booking, isLoading, isError } = useBooking(bookingId, { staleTime: 0 });

  if (!bookingId) {
    return (
      <PageWrapper className="max-w-lg mx-auto min-h-[60vh] flex items-center justify-center">
        <ErrorBanner message="We couldn't tell which booking this payment was for. Check My Bookings for its current status." />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" label="Loading your booking" />
      </PageWrapper>
    );
  }

  if (isError || !booking?.vehicleId) {
    return (
      <PageWrapper>
        <ErrorBanner message="Could not load your booking." />
      </PageWrapper>
    );
  }

  sessionStorage.setItem(`checkout:${bookingId}`, '1');
  sessionStorage.setItem(`booking:${booking.vehicleId}`, bookingId);
  return <Navigate to={`/book/${booking.vehicleId}/payment`} state={{ bookingId }} replace />;
}
