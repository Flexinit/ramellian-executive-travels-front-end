import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import PaymentStatusPanel from '../components/payment/PaymentStatusPanel';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useBooking } from '../hooks/useBookings';
import { useVehicle } from '../hooks/useVehicles';
import { usePaymentStatus, usePesapalCheckout } from '../hooks/usePayment';
import { PAYMENT_STATUSES } from '../lib/constants';

/**
 * The landing page Pesapal's own redirect comes back to once someone finishes (or abandons) paying —
 * `bookingId` isn't in this URL's path (unlike `/book/:vehicleId/payment`, which needs `vehicleId` there
 * too), so it's read from a `?bookingId=` query param first, falling back to the `lastCheckoutBookingId`
 * `usePesapalCheckout` stashes in sessionStorage right before redirecting to Pesapal — the same reasoning
 * `PaymentPage.jsx` already documents: Pesapal's redirect is a full page load, which loses React Router
 * state, so anything this page needs has to survive that some other way.
 *
 * Purely a status check: it polls `GET /payments/pesapal/bookings/{bookingId}/status` (via the same
 * `usePaymentStatus` `PaymentPage.jsx` uses) and never infers success itself, per
 * "do not mark payment successful in the browser" (FRONTEND_INTEGRATION.md §4). Successful, it offers
 * Continue to Sign Contract (the vehicle id for that route comes from the booking record, not the URL);
 * failed, it offers to retry checkout for the same booking; still pending, it keeps polling.
 */
export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const bookingId = new URLSearchParams(search).get('bookingId') || sessionStorage.getItem('lastCheckoutBookingId');

  const { data: booking, isLoading: bookingLoading, isError: bookingError } = useBooking(bookingId, { staleTime: 0 });
  const { data: vehicle } = useVehicle(booking?.vehicleId);
  const paymentStatus = usePaymentStatus(bookingId, !!bookingId);
  const retryCheckout = usePesapalCheckout();
  const status = paymentStatus.data?.status;

  if (!bookingId) {
    return (
      <PageWrapper className="max-w-lg mx-auto min-h-[60vh] flex items-center justify-center">
        <ErrorBanner message="We couldn't tell which booking this payment was for. Check My Bookings for its current status." />
      </PageWrapper>
    );
  }

  if (bookingLoading) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="lg" label="Loading your booking" />
      </PageWrapper>
    );
  }

  if (bookingError || !booking) {
    return (
      <PageWrapper>
        <ErrorBanner message="Could not load your booking." />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="max-w-md mx-auto">
      <PageTitle title="Payment Status" />
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-brand-white text-2xl font-bold">Payment Status</h1>
          <p className="text-brand-grey text-sm mt-1">Checking whether your payment went through.</p>
        </div>

        <PaymentStatusPanel status={status} onRetry={() => retryCheckout.mutate(bookingId)} booking={booking} vehicle={vehicle} />

        {status === PAYMENT_STATUSES.SUCCESSFUL && (
          <Button
            size="lg"
            onClick={() => navigate(`/book/${booking.vehicleId}/sign`, { state: { bookingId }, replace: true })}
          >
            Continue to Sign Contract
          </Button>
        )}
      </div>
    </PageWrapper>
  );
}
