import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, FileText, ArrowLeft, UserPlus, LogIn } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import PageWrapper from '../components/layout/PageWrapper';
import PageBackdrop from '../components/layout/PageBackdrop';
import PageTitle from '../components/layout/PageTitle';
import BookingProgress from '../components/booking/BookingProgress';
import BookingSummaryCard from '../components/booking/BookingSummaryCard';
import CheckoutPhonePrompt from '../components/booking/CheckoutPhonePrompt';
import CartTotals from '../components/booking/CartTotals';
import DocumentGateModal from '../components/documents/DocumentGateModal';
import RentalTermsList from '../components/booking/RentalTermsList';
import { useRentalTerms } from '../hooks/useRentalTerms';
import LoginModal from '../components/auth/LoginModal';
import RegisterModal from '../components/auth/RegisterModal';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { useStartNextBooking, bookingQuoteQuery } from '../hooks/useBooking';
import { useDocuments } from '../hooks/useDocuments';
import { useSetupPrompts } from '../hooks/useProfile';
import { normalizeVehicle } from '../hooks/useVehicles';
import { apiGet } from '../lib/api';
import { bookingWindowProblem, isOwnVehicle, tripTypeProblem } from '../lib/vehicleOptions';
import { missingBookingDocuments, modeProblem } from '../lib/cart';
import { BOOKING_MODES } from '../lib/constants';
import { formatCurrency } from '../lib/utils';
import nairobiSkyline from '../assets/destinations/nairobi-skyline.jpg';

/** Why a vehicle in the selection can't be booked right now, or null. `vehicle` is the live vehicle (undefined while loading). */
function itemProblem(item, vehicle, isError, user) {
  if (item.bookingId) return null;
  if (isError) return 'This vehicle is no longer listed. Please remove it to continue.';
  // The cart is kept in localStorage across visits, so a trip's start time — chosen whenever that vehicle
  // was added, possibly a previous session — can quietly lapse into the past before checkout is ever
  // reached. The backend then refuses the whole batch outright ("startTime: must be a future date"), which
  // otherwise surfaced as a raw, unattributed error with no indication of which vehicle or why.
  if (item.startTime && new Date(item.startTime) <= new Date()) {
    return "This trip's start time has passed since you added it. Edit it to choose new dates.";
  }
  if (!vehicle) return null;
  if (isOwnVehicle(vehicle, user)) return "This is your vehicle, so you can't book it. Please remove it to continue.";
  if (vehicle.available === false) return 'This vehicle is no longer available. Please remove it to continue.';
  return (
    modeProblem(vehicle, item.bookingMode) ||
    bookingWindowProblem(vehicle, item.startTime, item.endTime) ||
    tripTypeProblem(vehicle, item.tripType)
  );
}

/**
 * The last step before the account and the money: what is being booked, what it will cost, and what happens
 * next.
 *  - A visitor is asked to sign up (or log in) — arriving from Book, Create Account is already open; their
 *    selection is kept through registering and verifying their email (which signs them in), and this page is
 *    where they land afterwards.
 *  - Someone signed in has each vehicle re-checked against the live listing (still available, still bookable on
 *    those dates, current price), then the first vehicle's booking is created and they go on to its contract.
 *    The owner's contract is only readable once a booking exists, so it is reviewed — and accepted — just
 *    before paying. Missing/unapproved documents no longer block this: "Continue to contract" works either
 *    way (confirmed against the live spec 2026-10-06 — the backend now allows it, flagging it back via the
 *    booking's own `warnings` instead of refusing), with a non-blocking "you'll still need this by pickup"
 *    notice and an optional "Upload now" shown here, and the same warning shown again, harder to miss, right
 *    after the booking is actually created (`BookingWarningsModal`, on ContractPage).
 */
export default function BookingCheckoutPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const user = useAuthStore((s) => s.user);
  const start = useStartNextBooking();
  const [gateOpen, setGateOpen] = useState(false);
  // A started booking (bookingId set) already exists on the backend, so removing it here is confirmed
  // first — it only forgets the cart entry, the booking itself stays in My Bookings to cancel from there.
  const [pendingRemove, setPendingRemove] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const { data: rentalTerms = [] } = useRentalTerms();
  // null | 'login' | 'register' — one piece of state for both, so "Create one"/"Log in" inside either modal
  // can switch straight to the other without a moment where neither is open.
  const [authModal, setAuthModal] = useState(null);
  const pendingItem = items.find((i) => i.vehicleId === pendingRemove);
  const hasStarted = items.some((i) => i.bookingId);

  // Closes whichever auth modal is open the instant sign-in actually completes (the login modal's own form
  // submit or a Google credential — registration can't finish this way, it always goes on to verify-email
  // first) — `completeLogin` already navigates back to this same page for a guest with a selection, so this
  // page never unmounts; without this the modal would otherwise just sit there, open, over itself.
  useEffect(() => {
    if (isAuthenticated) setAuthModal(null);
  }, [isAuthenticated]);

  // A visitor's Book / Book now lands here with `state.auth` ('register'): Create Account opens straight away
  // over the booking. The state is cleared at once so a reload or Back doesn't reopen it.
  const location = useLocation();
  const navigate = useNavigate();
  const requestedAuth = location.state?.auth;
  useEffect(() => {
    if (!requestedAuth) return;
    if (!isAuthenticated && (requestedAuth === 'login' || requestedAuth === 'register')) setAuthModal(requestedAuth);
    navigate(location.pathname, { replace: true, state: null });
  }, [requestedAuth, isAuthenticated, navigate, location.pathname]);

  // Sign-up asks for the phone number and saves it; a profile still without one (an older account, or the
  // save after sign-up failed) is caught here — asked once, saved to the profile (CheckoutPhonePrompt).
  const { needsPhone } = useSetupPrompts();

  const { data: documents } = useDocuments({ enabled: isAuthenticated });
  // The listing may have changed since the vehicle was added (price, availability), so each is fetched again.
  const live = useQueries({
    queries: items.map((item) => ({
      queryKey: ['vehicles', item.vehicleId],
      queryFn: () => apiGet(`/vehicles/${item.vehicleId}`),
      select: normalizeVehicle,
      enabled: isAuthenticated && !item.bookingId,
      retry: false,
    })),
  });
  // The backend's own price for each vehicle not yet booked (docs/backend-requests.md item 3).
  const quoteResults = useQueries({
    queries: items.filter((i) => !i.bookingId).map((i) => bookingQuoteQuery({ vehicleId: i.vehicleId, startTime: i.startTime, endTime: i.endTime, deliveryRequested: i.deliveryRequested, bookingMode: i.bookingMode })),
  });
  const quotes = Object.fromEntries(
    items.filter((i) => !i.bookingId).map((i, idx) => [i.vehicleId, quoteResults[idx]?.data]).filter(([, data]) => !!data)
  );

  if (items.length === 0) return <Navigate to="/booking" replace />;

  // Show current prices, not the ones from when the vehicle was added.
  const current = items.map((item, i) => {
    const vehicle = live[i]?.data;
    return vehicle?.dailyPrice != null ? { ...item, vehicle: { ...item.vehicle, dailyPrice: vehicle.dailyPrice } } : item;
  });
  const problems = current.map((item, i) => itemProblem(item, live[i]?.data, live[i]?.isError, user));
  const blocked = problems.some(Boolean);
  const needsLicense = items.some((i) => i.bookingMode === BOOKING_MODES.SELF_DRIVE);
  // A booking can now be created before documents are approved — the backend says so via `warnings` on the
  // booking itself instead of refusing (see useStartNextBooking.js, docs/backend-requests.md item 29's
  // follow-up). So `missingDocs` is no longer something "Continue to contract" blocks on: it's just an
  // optional heads-up, with its own "Upload now" offered alongside — not instead of — continuing. The
  // 422/403 branch stays as a genuine fallback in case the backend ever still refuses outright for some
  // other reason (e.g. no identity document on file at all, as opposed to one merely pending review).
  const missingDocs = isAuthenticated && documents ? missingBookingDocuments(items, documents) : [];
  const gateStatus = start.error?.response?.status;
  const gateMissing = gateStatus === 422 || gateStatus === 403
    ? [start.error?.response?.data?.message || 'Your identity and licence documents must be approved before booking.']
    : missingDocs;

  function handleContinue() {
    start.mutate(undefined, {
      onError: (error) => {
        const status = error?.response?.status;
        if (status === 422 || status === 403) setGateOpen(true);
      },
    });
  }

  return (
    <PageBackdrop image={nairobiSkyline}>
    <PageWrapper className="max-w-5xl mx-auto">
      <PageTitle title="Checkout" />
      <div className="flex flex-col gap-6">
        <BookingProgress current="checkout" />

        <div>
          <h1 className="font-heading text-brand-white text-2xl font-bold">Checkout</h1>
          <p className="text-brand-grey text-sm mt-1">
            {isAuthenticated ? 'One last look, then on to the contract.' : 'Create your account to continue — your booking is saved.'}
          </p>
        </div>

        {/* Vehicles on the left, the total / next steps / action in a sidebar that stays put while the list
            scrolls — the same total or "what happens next" no longer has to be repeated per vehicle, and a
            wide screen uses its width instead of forcing everything into one long column. */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          <ul className="flex flex-col gap-4">
            {current.map((item, i) => (
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
                    problems[i] ? (
                      <p role="alert" className="text-red-400 text-xs">{problems[i]}</p>
                    ) : item.bookingId ? (
                      <p className="text-brand-gold text-xs">Booking started — continue to review its contract and pay.</p>
                    ) : live[i]?.data?.dailyPrice != null && live[i].data.dailyPrice !== items[i].vehicle.dailyPrice ? (
                      <p className="text-brand-gold text-xs">The daily price is now {formatCurrency(live[i].data.dailyPrice)}.</p>
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-4 lg:sticky lg:top-24">
            <CartTotals items={current} quotes={quotes} />


            {isAuthenticated ? (
              <div className="flex flex-col gap-3">
                {needsPhone && <CheckoutPhonePrompt />}
                {missingDocs.length > 0 && (
                  <p className="text-amber-300/90 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    You can continue without them, but {missingDocs.length > 1 ? 'these are' : 'this is'} still
                    needed before you can pick up the vehicle: {missingDocs.join(', ')}.{' '}
                    <button type="button" onClick={() => setGateOpen(true)} className="underline font-semibold hover:text-amber-200">
                      Upload now
                    </button>
                  </p>
                )}
                <Button size="lg" loading={start.isPending} disabled={blocked || needsPhone} onClick={handleContinue}>
                  {!start.isPending && <FileText size={16} aria-hidden="true" />} Continue to contract
                </Button>
                <Button to="/booking" className="self-start">
                  <ArrowLeft size={14} aria-hidden="true" /> Back
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Button size="lg" onClick={() => setAuthModal('register')}>
                  <UserPlus size={16} aria-hidden="true" /> Sign up to continue
                </Button>
                <Button size="lg" onClick={() => setAuthModal('login')}>
                  <LogIn size={16} aria-hidden="true" /> I have an account
                </Button>
                <Button to="/booking" className="self-start">
                  <ArrowLeft size={14} aria-hidden="true" /> Back
                </Button>
              </div>
            )}
            {/* After the actions, not before them: the buttons that move the booking on stay on screen without
                scrolling; this is reading for anyone who wants it. */}
            <Card className="p-4 flex flex-col gap-2">
              <h2 className="font-heading text-brand-white text-sm font-semibold">What happens next</h2>
              <ol className="flex flex-col gap-1.5 text-xs text-brand-grey list-decimal pl-4">
                {!isAuthenticated && <li>Create your account and verify your email. Your booking stays saved.</li>}
                <li>Have your ID ready (and your driving licence for self-drive).</li>
                <li>
                  {items.length > 1
                    ? "Read each owner's rental contract and accept them."
                    : "Read the owner's rental contract for your vehicle and accept it."}
                </li>
                <li>
                  Pay securely online{items.length > 1 ? ' — one payment for all of them' : ''}, then sign{' '}
                  {items.length > 1 ? 'each contract' : 'the contract'}.
                </li>
              </ol>
              {rentalTerms.length > 0 && (
                <button type="button" onClick={() => setTermsOpen(true)} className="self-start text-brand-gold text-xs font-semibold hover:text-brand-gold-light focus-ring rounded-md">
                  Read the rental terms
                </button>
              )}
            </Card>
            <Button size="sm" variant="danger" className="self-start" onClick={() => setConfirmClear(true)}>
              <Trash2 size={14} aria-hidden="true" /> Clear booking
            </Button>
          </div>
        </div>
      </div>

      <Modal isOpen={termsOpen} onClose={() => setTermsOpen(false)} title="Rental terms" size="lg">
        <RentalTermsList />
      </Modal>

      <LoginModal
        isOpen={authModal === 'login'}
        onClose={() => setAuthModal(null)}
        onReopen={() => setAuthModal('login')}
        onSwitchToRegister={() => setAuthModal('register')}
      />
      <RegisterModal
        isOpen={authModal === 'register'}
        onClose={() => setAuthModal(null)}
        onReopen={() => setAuthModal('register')}
        onSwitchToLogin={() => setAuthModal('login')}
      />

      <DocumentGateModal
        isOpen={gateOpen}
        onClose={() => setGateOpen(false)}
        missing={gateMissing}
        documents={documents}
        needsLicense={needsLicense}
      />

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
