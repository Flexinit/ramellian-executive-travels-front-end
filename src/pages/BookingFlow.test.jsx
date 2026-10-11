// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import BookingCartPage from './BookingCartPage';
import BookingContactPage from './BookingContactPage';
import BookingCheckoutPage from './BookingCheckoutPage';
import RegisterPage from './RegisterPage';
import LoginPage from './LoginPage';
import BookingConfirmPage from './BookingConfirmPage';
import CartLink from '../components/layout/CartLink';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function Where() {
  const { pathname, state } = useLocation();
  return (
    <p data-testid="where" data-booking={state?.bookingId || ''}>
      {pathname}
    </p>
  );
}

function renderAt(route) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/booking" element={<BookingCartPage />} />
            <Route path="/booking/contact" element={<BookingContactPage />} />
            <Route path="/booking/checkout" element={<BookingCheckoutPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/book/:vehicleId/confirm" element={<BookingConfirmPage />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

// Comfortably past any date this suite will realistically still be running on — a near-term date here
// (this used to be '2026-10-01') eventually becomes "today" or "the past" as the real clock advances, which
// trips the app's own "this trip's start time has passed" handling and changes what these tests see.
const line = (vehicleId, model, dailyPrice, extra = {}) => ({
  vehicleId,
  startTime: '2099-10-01T09:00:00Z',
  endTime: '2099-10-04T09:00:00Z', // 3 days
  bookingMode: 'CHAUFFEURED',
  tripType: null,
  renterNotes: '',
  vehicle: { id: vehicleId, model, dailyPrice, ownerEmail: 'owner@example.com', photos: [] },
  ...extra,
});

const live = (id, extra = {}) => ({ id, model: 'Live', pricePerDay: 15000, available: true, selfDrive: true, chauffeured: true, ownerEmail: 'owner@example.com', ...extra });

function serveVehicles(byId) {
  server.use(http.get(`${BASE}/vehicles/:id`, ({ params }) => HttpResponse.json(live(params.id, byId?.[params.id]))));
}

function signIn(email = 'renter@example.com') {
  act(() => useAuthStore.setState({ token: 'test-token', user: { id: 'u1', email, roles: ['RENTER'] } }));
}

const seed = (items, contact = null, groupId = null) => act(() => useCartStore.setState({ items, contact, groupId }));

beforeEach(() => seed([]));

afterEach(() => {
  act(() => {
    useAuthStore.setState({ token: null, user: null, mode: null });
    useCartStore.setState({ items: [], contact: null, groupId: null });
  });
});

describe('Your Booking — the basket', () => {
  it('shows each vehicle with its days × daily price and the total for all of them', () => {
    seed([line('a', 'Prado', 15000), line('b', 'Alphard', 20000)]);
    renderAt('/booking');

    expect(screen.getByRole('heading', { name: 'Prado' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alphard' })).toBeInTheDocument();
    expect(screen.getByText('3 days × KES 15,000')).toBeInTheDocument();
    expect(screen.getByText('3 days × KES 20,000')).toBeInTheDocument();
    // 3 × 15,000 + 3 × 20,000
    expect(within(screen.getByLabelText('Booking total')).getByText('KES 105,000')).toBeInTheDocument();
    expect(screen.getByText(/2 vehicles/i)).toBeInTheDocument();
  });

  it('needs no account to look at', () => {
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking');
    expect(screen.getByRole('heading', { name: 'Your Booking' })).toBeInTheDocument();
  });

  it('lets a vehicle be removed, and says so when nothing is left', async () => {
    const user = userEvent.setup();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking');

    await user.click(screen.getByRole('button', { name: /remove prado/i }));

    expect(screen.getByText(/you haven't chosen a vehicle yet/i)).toBeInTheDocument();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('offers another vehicle and takes a visitor from Book to sharing a contact', async () => {
    const user = userEvent.setup();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking');

    expect(screen.getByRole('link', { name: /add another vehicle/i })).toHaveAttribute('href', '/vehicles');
    await user.click(screen.getByRole('button', { name: /^book$/i }));

    expect(await screen.findByRole('heading', { name: /how can we reach you/i })).toBeInTheDocument();
  });

  it('takes someone already signed in straight from Book to checkout', async () => {
    const user = userEvent.setup();
    serveVehicles();
    signIn();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking');

    await user.click(screen.getByRole('button', { name: /^book$/i }));

    expect(await screen.findByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
  });
});

describe('Your Contact — a phone number or an email, their pick', () => {
  it('asks for a phone number first, and will not go on without one', async () => {
    const user = userEvent.setup();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/contact');

    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(screen.getByText(/enter your phone number/i)).toBeInTheDocument();
    expect(useCartStore.getState().contact).toBeNull();
  });

  it('keeps a phone number and goes on to checkout', async () => {
    const user = userEvent.setup();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/contact');

    await user.type(screen.getByLabelText(/phone number/i), '0712 345 678');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(useCartStore.getState().contact).toEqual({ kind: 'phone', value: '0712 345 678' });
    expect(await screen.findByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
  });

  it('records a lead for every vehicle in the selection, so the business can follow up (docs/backend-requests.md item 4)', async () => {
    const user = userEvent.setup();
    const leads = [];
    server.use(
      http.post(`${BASE}/booking-leads`, async ({ request }) => {
        leads.push(await request.json());
        return HttpResponse.json({ id: 'lead1' }, { status: 201 });
      })
    );
    seed([line('a', 'Prado', 15000, { renterNotes: 'Please arrive early' }), line('b', 'Alphard', 20000)]);
    renderAt('/booking/contact');

    await user.type(screen.getByLabelText(/phone number/i), '0712 345 678');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    await waitFor(() => expect(leads).toHaveLength(2));
    expect(leads[0]).toMatchObject({ phoneNumber: '0712 345 678', vehicleId: 'a', notes: 'Please arrive early' });
    expect(leads[1]).toMatchObject({ phoneNumber: '0712 345 678', vehicleId: 'b' });
  });

  it('does not let a failed lead stop checkout', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/booking-leads`, () => HttpResponse.json({ message: 'nope' }, { status: 500 })));
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/contact');

    await user.type(screen.getByLabelText(/phone number/i), '0712 345 678');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(await screen.findByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
  });

  it('switches to an email address and checks that it is one', async () => {
    const user = userEvent.setup();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/contact');

    await user.click(screen.getByRole('radio', { name: /email address/i }));
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(screen.getByText(/enter a valid email address/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/email address/i));
    await user.type(screen.getByLabelText(/email address/i), 'me@example.com');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(useCartStore.getState().contact).toEqual({ kind: 'email', value: 'me@example.com' });
  });

  it('says the contact is never shown to vehicle owners', () => {
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/contact');
    expect(screen.getByText(/never shown to vehicle owners/i)).toBeInTheDocument();
  });

  it('offers the same log-in shortcut on the standalone contact page', async () => {
    const user = userEvent.setup();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/contact');

    await user.click(screen.getByRole('button', { name: /already have an account\? log in/i }));
    expect(await screen.findByRole('dialog', { name: /log in/i })).toBeInTheDocument();
  });

  it('lets someone who already has an account skip it and log in right there, without sharing a contact', async () => {
    const user = userEvent.setup();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking');

    await user.click(screen.getByRole('button', { name: /^book$/i }));
    await user.click(await screen.findByRole('button', { name: /already have an account\? log in/i }));

    expect(await screen.findByRole('dialog', { name: /log in/i })).toBeInTheDocument();
    // Still on Your Booking: the Log In panel slid in over it, no page change.
    expect(screen.getByRole('heading', { name: 'Your Booking' })).toBeInTheDocument();
    expect(useCartStore.getState().contact).toBeNull();
  });

  it('goes back to the basket when it is empty, and on to checkout when already signed in', () => {
    renderAt('/booking/contact');
    expect(screen.getByText(/you haven't chosen a vehicle yet/i)).toBeInTheDocument();
  });
});

describe('Checkout — a visitor', () => {
  it('shows what is booked, the estimated total and what happens next, then asks them to sign up', () => {
    seed([line('a', 'Prado', 15000)], { kind: 'email', value: 'me@example.com' });
    renderAt('/booking/checkout');

    expect(screen.getByText('Prado')).toBeInTheDocument();
    // Synchronous assertion, before the live quote (async) can resolve — this is checking the client-side
    // fallback total (lineTotal), same as it always has; the live-quote path has its own test below.
    expect(within(screen.getByLabelText('Booking total')).getByText('KES 45,000')).toBeInTheDocument();
    expect(screen.getByText(/rental contract for your vehicle/i)).toBeInTheDocument();
    expect(screen.getByText('me@example.com')).toBeInTheDocument();
    // Both "Sign up to continue" and "I have an account" open their modal in place now, rather than
    // navigating away — see the dedicated tests below for the modals themselves.
    expect(screen.getByRole('button', { name: /sign up to continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /i have an account/i })).toBeInTheDocument();
  });

  it('says every owner’s contract is read in turn, but paid for together', () => {
    seed([line('a', 'Prado', 15000), line('b', 'Alphard', 20000)]);
    renderAt('/booking/checkout');
    expect(screen.getByText(/one payment for all of them/i)).toBeInTheDocument();
  });

  it('logs in from the "I have an account" modal without ever leaving the checkout page', async () => {
    const user = userEvent.setup();
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const token = `${b64({ alg: 'HS384' })}.${b64({ userId: 'u1', email: 'ann@example.com', roles: ['RENTER'], enabled: true, permissions: [] })}.sig`;
    server.use(http.post(`${BASE}/auth/login`, () => HttpResponse.json({ accessToken: token })));
    seed([line('a', 'Prado', 15000)]);
    serveVehicles();
    renderAt('/booking/checkout');

    await user.click(screen.getByRole('button', { name: /i have an account/i }));
    const dialog = await screen.findByRole('dialog', { name: /log in/i });

    await user.type(within(dialog).getByLabelText('Email'), 'ann@example.com');
    await user.type(within(dialog).getByLabelText('Password'), 'secret123');
    await user.click(within(dialog).getByRole('button', { name: /^log in$/i }));

    // Never navigated to /auth/login — the dialog just closes and the same page shows the signed-in view.
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /log in/i })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /continue to contract/i })).toBeInTheDocument();
  });

  it('registers from the "Sign up to continue" modal, then moves on to verify-email as usual', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/auth/register`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ message: 'ok' }, { status: 201 });
      })
    );
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/checkout');

    await user.click(screen.getByRole('button', { name: /sign up to continue/i }));
    const dialog = await screen.findByRole('dialog', { name: /create account/i });

    await user.type(within(dialog).getByLabelText('First Name'), 'Ann');
    await user.type(within(dialog).getByLabelText('Last Name'), 'Lee');
    await user.type(within(dialog).getByLabelText('Email'), 'ann@example.com');
    await user.type(within(dialog).getByLabelText('Password'), 'supersecret1');
    await user.type(within(dialog).getByLabelText('Confirm Password'), 'supersecret1');
    await user.click(within(dialog).getByLabelText(/terms of service/i));
    await user.click(within(dialog).getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(body).toEqual({ firstName: 'Ann', lastName: 'Lee', email: 'ann@example.com', password: 'supersecret1' }));
    // Registration still can't avoid the real verify-email page (there's a code to type in) — only the
    // typing-in-your-details step was ever meant to stay in place.
    expect(await screen.findByTestId('where')).toHaveTextContent('/auth/verify-email');
  });

  it('switches straight from the register modal to the login modal, and back, without closing either in between', async () => {
    const user = userEvent.setup();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/checkout');

    await user.click(screen.getByRole('button', { name: /sign up to continue/i }));
    await screen.findByRole('dialog', { name: /create account/i });
    await user.click(screen.getByRole('button', { name: /^log in$/i }));

    expect(screen.queryByRole('dialog', { name: /create account/i })).not.toBeInTheDocument();
    const loginDialog = await screen.findByRole('dialog', { name: /log in/i });

    await user.click(within(loginDialog).getByRole('button', { name: /create one/i }));
    expect(screen.queryByRole('dialog', { name: /log in/i })).not.toBeInTheDocument();
    expect(await screen.findByRole('dialog', { name: /create account/i })).toBeInTheDocument();
  });
});

describe('Checkout — signed in, one vehicle', () => {
  it('creates that one booking with POST /bookings/create, then opens its contract', async () => {
    const user = userEvent.setup();
    const created = [];
    serveVehicles();
    server.use(
      http.post(`${BASE}/bookings/create`, async ({ request }) => {
        const body = await request.json();
        created.push(body);
        return HttpResponse.json({ id: 'bk-1', vehicleId: body.vehicleId }, { status: 201 });
      })
    );
    signIn();
    seed([line('a', 'Prado', 15000, { renterNotes: 'Call 0712345678 on arrival' })]);
    renderAt('/booking/checkout');

    await user.click(await screen.findByRole('button', { name: /continue to contract/i }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/book/a/contract'));
    expect(screen.getByTestId('where')).toHaveAttribute('data-booking', 'bk-1');
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ vehicleId: 'a', startTime: '2099-10-01T09:00:00Z', endTime: '2099-10-04T09:00:00Z', bookingMode: 'CHAUFFEURED' });
    // Phone numbers are stripped from notes on the way out.
    expect(created[0].renterNotes).not.toMatch(/0712345678/);
    expect(useCartStore.getState().items.find((i) => i.vehicleId === 'a').bookingId).toBe('bk-1');
    expect(useCartStore.getState().groupId).toBeNull();
  });

  it('sends whether the vehicle is to be delivered, so the backend adds the delivery fee', async () => {
    const user = userEvent.setup();
    const created = [];
    serveVehicles();
    server.use(
      http.post(`${BASE}/bookings/create`, async ({ request }) => {
        created.push(await request.json());
        return HttpResponse.json({ id: 'bk-1' }, { status: 201 });
      })
    );
    signIn();
    seed([line('a', 'Prado', 15000, { deliveryRequested: true, pickupLocation: 'Westlands' })]);
    renderAt('/booking/checkout');

    expect(await screen.findByText(/delivered to you/i)).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /continue to contract/i }));

    await waitFor(() => expect(created).toHaveLength(1));
    expect(created[0]).toMatchObject({ deliveryRequested: true, pickupLocation: 'Westlands' });
  });
});

describe('Checkout — signed in, several vehicles (docs/backend-requests.md item 1)', () => {
  it('creates every booking in one batch, under one group, and opens the first one’s contract', async () => {
    const user = userEvent.setup();
    let batchBody;
    serveVehicles();
    server.use(
      http.post(`${BASE}/bookings/create-batch`, async ({ request }) => {
        batchBody = await request.json();
        return HttpResponse.json(
          {
            groupId: 'g1',
            status: 'PENDING',
            totalEstimatedAmount: 105000,
            bookings: batchBody.bookings.map((b, i) => ({ id: `bk-${i + 1}`, vehicleId: b.vehicleId })),
          },
          { status: 201 }
        );
      })
    );
    signIn();
    seed([line('a', 'Prado', 15000), line('b', 'Alphard', 20000)]);
    renderAt('/booking/checkout');

    await user.click(await screen.findByRole('button', { name: /continue to contract/i }));

    // The entry into the group uses the first vehicle's own id in the URL, same as a single booking would —
    // ContractPage falls back to it if it can't find the booking; `bookingId` (from state) is what it actually loads.
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/book/a/contract'));
    expect(screen.getByTestId('where')).toHaveAttribute('data-booking', 'bk-1');
    expect(batchBody.bookings.map((b) => b.vehicleId)).toEqual(['a', 'b']);
    expect(useCartStore.getState().groupId).toBe('g1');
    expect(useCartStore.getState().items.find((i) => i.vehicleId === 'a').bookingId).toBe('bk-1');
    expect(useCartStore.getState().items.find((i) => i.vehicleId === 'b').bookingId).toBe('bk-2');
  });

  it('does not re-batch a group that already has every booking created', async () => {
    const user = userEvent.setup();
    let batched = false;
    serveVehicles();
    server.use(http.post(`${BASE}/bookings/create-batch`, () => { batched = true; return HttpResponse.json({ groupId: 'g1', bookings: [] }, { status: 201 }); }));
    signIn();
    seed([line('a', 'Prado', 15000, { bookingId: 'bk-1' }), line('b', 'Alphard', 20000, { bookingId: 'bk-2' })], null, 'g1');
    renderAt('/booking/checkout');

    await user.click(await screen.findByRole('button', { name: /continue to contract/i }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/book/a/contract'));
    expect(batched).toBe(false);
  });

  it('does not book a vehicle twice when the renter comes back part-way', async () => {
    const user = userEvent.setup();
    let posts = 0;
    serveVehicles();
    server.use(http.post(`${BASE}/bookings/create`, () => { posts += 1; return HttpResponse.json({ id: 'other' }, { status: 201 }); }));
    signIn();
    seed([line('a', 'Prado', 15000, { bookingId: 'bk-1' })]);
    renderAt('/booking/checkout');

    await user.click(await screen.findByRole('button', { name: /continue to contract/i }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveAttribute('data-booking', 'bk-1'));
    expect(posts).toBe(0);
  });

  it('warns about missing documents without blocking checkout — the backend now allows this (2026-10-06)', async () => {
    const user = userEvent.setup();
    let posts = 0;
    serveVehicles();
    server.use(
      http.get(`${BASE}/documents/me`, () => HttpResponse.json([])),
      http.post(`${BASE}/bookings/create`, () => { posts += 1; return HttpResponse.json({ id: 'x', warnings: ['Upload your ID before pickup.'] }, { status: 201 }); })
    );
    signIn();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/checkout');

    await waitFor(() => expect(screen.getByRole('button', { name: /continue to contract/i })).toBeEnabled());
    // wait for the documents to have loaded
    await act(() => new Promise((r) => setTimeout(r, 100)));
    expect(screen.getByText(/you can continue without them/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continue to contract/i }));

    // This harness doesn't register /book/:vehicleId/contract (ContractPage, and the warnings modal it
    // shows, are covered separately in ContractPage.test.jsx) — just confirms checkout didn't block on it.
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/book/a/contract'));
    expect(posts).toBe(1);
  });

  it('still offers to upload documents right away from checkout\'s own notice, optionally', async () => {
    const user = userEvent.setup();
    serveVehicles();
    server.use(http.get(`${BASE}/documents/me`, () => HttpResponse.json([])));
    signIn();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/checkout');

    await act(() => new Promise((r) => setTimeout(r, 100)));
    await user.click(screen.getByRole('button', { name: /upload now/i }));

    expect(await screen.findByText(/verification required/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByText(/what's your id number/i)).toBeInTheDocument();
  });

  it('shows the document gate when the backend says the documents are not approved (422)', async () => {
    const user = userEvent.setup();
    serveVehicles();
    server.use(http.post(`${BASE}/bookings/create`, () => HttpResponse.json({ message: 'Documents not approved' }, { status: 422 })));
    signIn();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/checkout');

    await user.click(await screen.findByRole('button', { name: /continue to contract/i }));

    expect(await screen.findByText(/verification required/i)).toBeInTheDocument();
    expect(screen.getByText(/documents not approved/i)).toBeInTheDocument();
  });

  it('will not book an owner’s own vehicle', async () => {
    serveVehicles({ a: { ownerEmail: 'renter@example.com' } });
    signIn('renter@example.com');
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/checkout');

    expect(await screen.findByRole('alert')).toHaveTextContent(/this is your vehicle/i);
    expect(screen.getByRole('button', { name: /continue to contract/i })).toBeDisabled();
  });

  it('stops on a vehicle that is no longer available, until it is removed', async () => {
    const user = userEvent.setup();
    serveVehicles({ a: { available: false } });
    signIn();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/checkout');

    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer available/i);
    expect(screen.getByRole('button', { name: /continue to contract/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /remove prado/i }));
    expect(await screen.findByText(/you haven't chosen a vehicle yet/i)).toBeInTheDocument();
  });

  it("stops on a vehicle whose trip start time has lapsed into the past since it was added, until it is edited or removed", async () => {
    const user = userEvent.setup();
    serveVehicles({ a: {} });
    signIn();
    // The cart survives across visits (localStorage) — this is a date chosen in an earlier session that
    // has since passed, not something picked just now.
    seed([line('a', 'Prado', 15000, { startTime: '2020-01-01T09:00:00Z', endTime: '2020-01-04T09:00:00Z' })]);
    renderAt('/booking/checkout');

    expect(await screen.findByRole('alert')).toHaveTextContent(/trip's start time has passed/i);
    expect(screen.getByRole('button', { name: /continue to contract/i })).toBeDisabled();
    // Fixing the dates doesn't require starting over — Edit goes straight to the vehicle's own page,
    // where the date picker lives, with this vehicle's current selection pre-filled.
    expect(screen.getByRole('link', { name: /^edit$/i })).toHaveAttribute('href', '/vehicles/a');

    await user.click(screen.getByRole('button', { name: /remove prado/i }));
    expect(await screen.findByText(/you haven't chosen a vehicle yet/i)).toBeInTheDocument();
  });

  it('shows the current price when it changed since the vehicle was added', async () => {
    serveVehicles({ a: { pricePerDay: 20000 } });
    // A live quote reflects the vehicle's current price, same as the backend would compute it.
    server.use(http.post(`${BASE}/bookings/quote`, () => HttpResponse.json({ vehicleId: 'a', numberOfDays: 3, pricePerDay: 20000, baseAmount: 60000, platformFee: 0, totalAmount: 60000 })));
    signIn();
    seed([line('a', 'Prado', 15000)]);
    renderAt('/booking/checkout');

    expect(await screen.findByText(/daily price is now KES 20,000/i)).toBeInTheDocument();
    expect(within(screen.getByLabelText('Booking total')).getByText('KES 60,000')).toBeInTheDocument();
  });
});

describe('After registering or logging in with a booking waiting', () => {
  it('starts the sign-up form with the email they shared, and says the booking is saved', () => {
    seed([line('a', 'Prado', 15000)], { kind: 'email', value: 'me@example.com' });
    renderAt('/auth/register');

    expect(screen.getByLabelText('Email')).toHaveValue('me@example.com');
    expect(screen.getByText(/your booking is saved/i)).toBeInTheDocument();
  });

  it('takes them back to checkout after logging in', async () => {
    const user = userEvent.setup();
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const token = `${b64({ alg: 'HS384' })}.${b64({ userId: 'u1', email: 'ann@example.com', roles: ['RENTER'], enabled: true, permissions: [] })}.sig`;
    server.use(http.post(`${BASE}/auth/login`, () => HttpResponse.json({ accessToken: token })));
    seed([line('a', 'Prado', 15000)]);
    serveVehicles();
    renderAt('/auth/login');

    await user.type(screen.getByLabelText('Email'), 'ann@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /^log in$/i }));

    expect(await screen.findByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
  });

  it('lands on the dashboard as usual when nothing is waiting', async () => {
    const user = userEvent.setup();
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const token = `${b64({ alg: 'HS384' })}.${b64({ userId: 'u1', email: 'ann@example.com', roles: ['RENTER'], enabled: true, permissions: [] })}.sig`;
    server.use(http.post(`${BASE}/auth/login`, () => HttpResponse.json({ accessToken: token })));
    renderAt('/auth/login');

    await user.type(screen.getByLabelText('Email'), 'ann@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /^log in$/i }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard'));
  });
});

describe('Finishing a single-vehicle booking', () => {
  it('offers the next one when the renter has more than one non-grouped booking waiting', async () => {
    // Predates the combined checkout: two SEPARATE single-vehicle bookings (no groupId), each still
    // contracted and paid on its own — see the "Finishing a group booking" tests below for 2+ vehicles.
    const user = userEvent.setup();
    let created;
    server.use(
      http.post(`${BASE}/bookings/create`, async ({ request }) => {
        created = await request.json();
        return HttpResponse.json({ id: 'bk-2', vehicleId: created.vehicleId }, { status: 201 });
      })
    );
    signIn();
    seed([line('a', 'Prado', 15000, { bookingId: 'bk-1' }), line('b', 'Alphard', 20000)]);
    renderAt('/book/bk-1/confirm');

    expect(await screen.findByText(/1 more vehicle is still in your booking/i)).toBeInTheDocument();
    expect(useCartStore.getState().items.map((i) => i.vehicleId)).toEqual(['b']);

    await user.click(screen.getByRole('button', { name: /continue with the next vehicle/i }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/book/b/contract'));
    expect(screen.getByTestId('where')).toHaveAttribute('data-booking', 'bk-2');
    expect(created.vehicleId).toBe('b');
  });

  it("refuses to book the next vehicle client-side if its trip start time has since passed, instead of sending a doomed request", async () => {
    // This page (unlike BookingCheckoutPage) has no per-item date list to show a problem against, so the
    // check lives in useStartNextBooking itself — the one place both callers share.
    const user = userEvent.setup();
    let requested = false;
    server.use(http.post(`${BASE}/bookings/create`, () => { requested = true; return HttpResponse.json({ id: 'bk-2' }, { status: 201 }); }));
    signIn();
    seed([line('a', 'Prado', 15000, { bookingId: 'bk-1' }), line('b', 'Alphard', 20000, { startTime: '2020-01-01T09:00:00Z', endTime: '2020-01-04T09:00:00Z' })]);
    renderAt('/book/bk-1/confirm');

    await user.click(await screen.findByRole('button', { name: /continue with the next vehicle/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /booking confirmed/i })).toBeInTheDocument());
    expect(requested).toBe(false);
    expect(useCartStore.getState().items.map((i) => i.vehicleId)).toEqual(['b']);
  });

  it('offers nothing more when that was the last vehicle', async () => {
    signIn();
    seed([line('a', 'Prado', 15000, { bookingId: 'bk-1' })], { kind: 'email', value: 'me@example.com' });
    renderAt('/book/bk-1/confirm');

    expect(await screen.findByRole('heading', { name: /booking confirmed/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next vehicle/i })).not.toBeInTheDocument();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().contact).toBeNull();
  });
});

describe('Finishing a group booking (several vehicles, one combined payment)', () => {
  it('clears every vehicle in the group at once, with no "next vehicle" prompt', async () => {
    signIn();
    seed(
      [
        line('a', 'Prado', 15000, { bookingId: 'bk-1', contractAccepted: true, signed: true }),
        line('b', 'Alphard', 20000, { bookingId: 'bk-2', contractAccepted: true, signed: true }),
      ],
      { kind: 'email', value: 'me@example.com' },
      'g1'
    );
    renderAt('/book/bk-2/confirm');

    expect(await screen.findByRole('heading', { name: /booking confirmed/i })).toBeInTheDocument();
    expect(screen.queryByText(/still in your booking/i)).not.toBeInTheDocument();
    await waitFor(() => expect(useCartStore.getState().items).toEqual([]));
    expect(useCartStore.getState().groupId).toBeNull();
    expect(useCartStore.getState().contact).toBeNull();
  });
});

describe('The basket link in the top bar', () => {
  function renderLink() {
    return render(
      <MemoryRouter>
        <CartLink />
      </MemoryRouter>
    );
  }

  it('is not shown while nothing has been added', () => {
    renderLink();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows how many vehicles are in the booking and opens it', () => {
    seed([line('a', 'Prado', 15000), line('b', 'Alphard', 20000)]);
    renderLink();
    const link = screen.getByRole('link', { name: /your booking, 2 vehicles/i });
    expect(link).toHaveAttribute('href', '/booking');
    expect(link).toHaveTextContent('2');
  });
});
