import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import PageBackdrop from '../components/layout/PageBackdrop';
import PageTitle from '../components/layout/PageTitle';
import BookingProgress from '../components/booking/BookingProgress';
import ContactForm from '../components/booking/ContactForm';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import nairobiSkyline from '../assets/destinations/nairobi-skyline.jpg';

/**
 * A visitor's next step after "Book": how can we reach you — a phone number OR an email address (their pick).
 * It is kept with the selection and used to start their account and to follow up on the booking. It is never
 * shown to vehicle owners. Someone who is already signed in has no use for this step.
 *
 * This is the standalone page at `/booking/contact`, kept so a direct link to it (or the browser's Back
 * button) still works; the usual way into this step is now `BookingContactDrawer`, opened in place from the
 * cart or checkout pages instead of navigating here — see that component for why.
 */
export default function BookingContactPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  if (items.length === 0) return <Navigate to="/booking" replace />;
  if (isAuthenticated) return <Navigate to="/booking/checkout" replace />;

  return (
    <PageBackdrop image={nairobiSkyline}>
      <PageWrapper className="max-w-md mx-auto">
        <PageTitle title="Your Contact" />
        <div className="flex flex-col gap-8">
          <BookingProgress current="contact" />

          <div>
            <h1 className="font-heading text-brand-white text-2xl font-bold">How can we reach you?</h1>
            <p className="text-brand-grey text-sm mt-1">
              Share a phone number or an email address, whichever you prefer. We use it to start your account and to
              follow up on your booking — it is never shown to vehicle owners.
            </p>
          </div>

          <ContactForm backHref="/booking" onSubmitted={() => navigate('/booking/checkout')} />
        </div>
      </PageWrapper>
    </PageBackdrop>
  );
}
