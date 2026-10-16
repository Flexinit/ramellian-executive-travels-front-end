import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { CarFront, Pencil, Trash2, ArrowRight, Plus } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageBackdrop from '../components/layout/PageBackdrop';
import PageTitle from '../components/layout/PageTitle';
import BookingProgress from '../components/booking/BookingProgress';
import BookingSummaryCard from '../components/booking/BookingSummaryCard';
import CartTotals from '../components/booking/CartTotals';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { bookingQuoteQuery } from '../hooks/useBooking';
import nairobiSkyline from '../assets/destinations/nairobi-skyline.jpg';

/**
 * The renter's selection — every vehicle they've added, each with its own dates and its price worked out from
 * the number of days, and the total. Open to everyone: nothing here needs an account. "Book" then asks a visitor
 * how to reach them (a phone number or email address) before checkout; someone signed in goes straight to checkout.
 */
export default function BookingCartPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  // A started booking (bookingId set) already exists on the backend, so removing it here is confirmed
  // first — it only forgets the cart entry, the booking itself stays in My Bookings to cancel from there.
  const [pendingRemove, setPendingRemove] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const pendingItem = items.find((i) => i.vehicleId === pendingRemove);
  const hasStarted = items.some((i) => i.bookingId);
  // The backend's own price, per vehicle not yet booked — a booked vehicle's amount is already fixed by
  // its BookingResponse, so it has nothing left to quote.
  const quoteResults = useQueries({
    queries: items.filter((i) => !i.bookingId).map((i) => bookingQuoteQuery({ vehicleId: i.vehicleId, startTime: i.startTime, endTime: i.endTime, deliveryRequested: i.deliveryRequested, bookingMode: i.bookingMode })),
  });
  const quotes = Object.fromEntries(
    items.filter((i) => !i.bookingId).map((i, idx) => [i.vehicleId, quoteResults[idx]?.data]).filter(([, data]) => !!data)
  );

  if (items.length === 0) {
    return (
      <PageBackdrop image={nairobiSkyline}>
        <PageWrapper className="max-w-2xl mx-auto">
          <PageTitle title="Your Booking" />
          <EmptyState
            icon={CarFront}
            title="You haven't chosen a vehicle yet"
            description="Find a vehicle, pick your dates and add it to your booking. You can add more than one."
            action={{ label: 'Browse vehicles', onClick: () => navigate('/vehicles') }}
          />
        </PageWrapper>
      </PageBackdrop>
    );
  }

  return (
    <PageBackdrop image={nairobiSkyline}>
    <PageWrapper className="max-w-5xl mx-auto">
      <PageTitle title="Your Booking" />
      <div className="flex flex-col gap-6">
        <BookingProgress current="selection" />

        <div>
          <h1 className="font-heading text-brand-white text-2xl font-bold">Your Booking</h1>
          <p className="text-brand-grey text-sm mt-1">
            Check the vehicles and dates. You can add another vehicle, or book what you have.
          </p>
        </div>

        {/* Vehicles on the left, the total and the primary action in a sidebar that stays in view while the
            list scrolls — see BookingSummaryCard/BookingCheckoutPage for why the total isn't repeated per card. */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.vehicleId}>
                <BookingSummaryCard
                  vehicle={item.vehicle}
                  draft={item}
                  quote={quotes[item.vehicleId]}
                  actions={
                    <>
                      {!item.bookingId && (
                        <Button size="sm" to={`/vehicles/${item.vehicleId}`}>
                          <Pencil size={14} aria-hidden="true" /> Edit
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => (item.bookingId ? setPendingRemove(item.vehicleId) : removeItem(item.vehicleId))}
                        aria-label={`Remove ${item.vehicle.model}`}
                      >
                        <Trash2 size={14} aria-hidden="true" /> Remove
                      </Button>
                    </>
                  }
                  note={
                    item.bookingId ? (
                      <p className="text-brand-gold text-xs">Booking started — continue from checkout to review its contract and pay.</p>
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            <CartTotals items={items} quotes={quotes} />
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => navigate('/booking/checkout', isAuthenticated ? undefined : { state: { auth: 'register' } })}>
                <ArrowRight size={16} aria-hidden="true" /> Book
              </Button>
              <Button to="/vehicles" className="self-start">
                <Plus size={14} aria-hidden="true" /> Add another vehicle
              </Button>
              <Button size="sm" variant="danger" className="self-start" onClick={() => setConfirmClear(true)}>
                <Trash2 size={14} aria-hidden="true" /> Clear booking
              </Button>
            </div>
          </div>
        </div>
      </div>


      <Modal isOpen={!!pendingRemove} onClose={() => setPendingRemove(null)} title="Remove from your booking">
        <div className="flex flex-col gap-4">
          <p className="text-brand-grey text-sm">
            Remove {pendingItem?.vehicle?.model}? Its booking has already started, so it stays in My Bookings —
            cancel it there if you no longer want it at all.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => setPendingRemove(null)}>Keep it</Button>
            <Button variant="danger" onClick={() => { removeItem(pendingRemove); setPendingRemove(null); }}>
              <Trash2 size={14} aria-hidden="true" /> Remove from list
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={confirmClear} onClose={() => setConfirmClear(false)} title="Clear your booking">
        <div className="flex flex-col gap-4">
          <p className="text-brand-grey text-sm">
            Remove every vehicle from your booking?{' '}
            {hasStarted && 'Any booking already started stays in My Bookings — cancel it there if you no longer want it. '}
            This can&apos;t be undone here.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => setConfirmClear(false)}>Keep my booking</Button>
            <Button variant="danger" onClick={() => { clear(); setConfirmClear(false); }}>
              <Trash2 size={14} aria-hidden="true" /> Clear everything
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
    </PageBackdrop>
  );
}
