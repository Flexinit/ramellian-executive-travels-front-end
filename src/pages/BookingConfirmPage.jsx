import React, { useEffect } from 'react';
import PageBackdrop from '../components/layout/PageBackdrop';
import coastalLodge from '../assets/destinations/coastal-lodge.jpg';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight, LayoutDashboard, Car } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Logo from '../components/ui/Logo';
import Button from '../components/ui/Button';
import CountdownTimer from '../components/ui/CountdownTimer';
import { useCartStore } from '../store/cartStore';
import { useStartNextBooking } from '../hooks/useBooking';

/**
 * The booking is fully confirmed by the time a renter reaches this page
 * (paid + signed) — the 15-minute pending-payment hold no longer applies,
 * so CountdownTimer is shown already expired (00:00) purely as a visual
 * "that hold is over, you're locked in" marker rather than a live timer.
 *
 * The address carries the booking's id (see useSignContract).
 *  - Not part of a group — that one booking leaves the renter's selection here; if they chose more than one
 *    vehicle (each booked and paid separately), the next one is offered.
 *  - Part of a group (`docs/backend-requests.md` item 1 — one combined payment for every vehicle) — every
 *    booking in it was signed before reaching here (`useSignContract` only sends the *last* one here), so
 *    the whole selection clears at once and there is no "next vehicle" to offer.
 */
export default function BookingConfirmPage() {
  const navigate = useNavigate();
  const { vehicleId: bookingId } = useParams();
  const completeBooking = useCartStore((s) => s.completeBooking);
  const completeGroup = useCartStore((s) => s.completeGroup);
  const remaining = useCartStore((s) => s.items.length);
  const startNext = useStartNextBooking();

  useEffect(() => {
    if (!bookingId) return;
    if (useCartStore.getState().groupId) {
      completeGroup();
    } else {
      completeBooking(bookingId);
    }
  }, [bookingId, completeBooking, completeGroup]);

  return (
    <PageBackdrop image={coastalLodge}>
    <PageWrapper className="max-w-md mx-auto min-h-[70vh] flex flex-col items-center justify-center text-center gap-6">
      <PageTitle title="Booking Confirmed" />
      <Link to="/" className="focus-ring rounded-lg">
        <Logo size="md" />
      </Link>

      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
        <CheckCircle2 size={30} className="text-emerald-400" aria-hidden="true" />
      </div>

      <div>
        <h1 className="font-heading text-brand-white text-2xl font-bold">Booking Confirmed</h1>
        <p className="text-brand-grey text-sm mt-2">
          Your payment and signed contract are in — your chauffeur or vehicle will be ready as booked.
        </p>
      </div>

      <CountdownTimer expiresAt={Date.now() - 1000} onExpired={() => {}} />

      {remaining > 0 && (
        <div className="flex flex-col gap-3 w-full rounded-xl bg-brand-gold/10 border border-brand-gold/20 p-4 text-sm text-brand-white">
          <p>
            {remaining === 1 ? '1 more vehicle is' : `${remaining} more vehicles are`} still in your booking.
          </p>
          <Button size="lg" loading={startNext.isPending} onClick={() => startNext.mutate()}>
            {!startNext.isPending && <ArrowRight size={16} aria-hidden="true" />} Continue with the next vehicle
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button size="lg" className="flex-1" onClick={() => navigate('/dashboard')}>
          <LayoutDashboard size={16} aria-hidden="true" /> Go to Dashboard
        </Button>
        <Button size="lg" className="flex-1" onClick={() => navigate('/vehicles')}>
          <Car size={16} aria-hidden="true" /> Browse More Vehicles
        </Button>
      </div>
    </PageWrapper>
    </PageBackdrop>
  );
}
