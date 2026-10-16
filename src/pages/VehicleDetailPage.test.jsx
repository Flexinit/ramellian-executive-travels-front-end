// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useBookingStore } from '../store/bookingStore';
import VehicleDetailPage from './VehicleDetailPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

const VEHICLE = {
  id: 'v1',
  model: 'Mercedes Benz',
  vin: 'VIN-SECRET-1',
  registrationNumber: 'KDA 123A',
  location: 'Roysambu',
  pricePerDay: 15000,
  color: 'Black',
  capacity: 8,
  fuelType: 'DIESEL',
  transmissionType: 'AUTOMATIC',
  selfDrive: true,
  chauffeured: true,
  hasWorkingAC: true,
  comprehensiveInsurance: true,
  tripTypes: ['WEDDING', 'SAFARI'],
  available: true,
  ownerEmail: 'owner@example.com',
};

function serve(vehicle = VEHICLE) {
  server.use(http.get(`${BASE}/vehicles/:id`, () => HttpResponse.json(vehicle)));
}

function signIn(email) {
  act(() => useAuthStore.setState({ token: 'test-token', user: { id: 'u1', email, roles: ['RENTER'] } }));
}

function renderAt(route) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/vehicles/:vehicleId" element={<VehicleDetailPage />} />
            <Route path="/booking" element={<p>the basket</p>} />
            <Route path="/booking/checkout" element={<p>checkout</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

afterEach(() => {
  act(() => {
    useAuthStore.setState({ token: null, user: null });
    useCartStore.setState({ items: [], contact: null });
    useBookingStore.getState().clearDraft();
    useBookingStore.getState().setSearch({});
  });
});

describe('Booking straight from the vehicle, with what was searched for', () => {
  const START = '2099-10-01T09:00:00.000Z';
  const END = '2099-10-04T09:00:00.000Z';
  const search = (extra = {}) =>
    act(() => useBookingStore.getState().setSearch({ startTime: START, endTime: END, bookingMode: 'CHAUFFEURED', pickupLocation: 'JKIA', dropoffLocation: 'Westlands', ...extra }));

  it('starts the form with the searched dates, mode and places', async () => {
    serve();
    search();
    renderAt('/vehicles/v1');

    await screen.findByRole('button', { name: /book now/i });
    await waitFor(() =>
      expect(useBookingStore.getState().draft).toMatchObject({
        startTime: START, endTime: END, bookingMode: 'CHAUFFEURED', pickupLocation: 'JKIA', dropoffLocation: 'Westlands',
      })
    );
    expect(screen.getByText('3 days × KES 15,000')).toBeInTheDocument();
  });

  it('leaves out searched dates that have already passed', async () => {
    serve();
    search({ startTime: '2020-01-01T09:00:00.000Z', endTime: '2020-01-03T09:00:00.000Z' });
    renderAt('/vehicles/v1');

    await screen.findByRole('button', { name: /book now/i });
    await waitFor(() => expect(useBookingStore.getState().draft.vehicleId).toBe('v1'));
    expect(useBookingStore.getState().draft.startTime).toBeNull();
  });

  it('uses the vehicle’s only mode when it does not offer the one searched for', async () => {
    serve({ ...VEHICLE, chauffeured: false });
    search();
    renderAt('/vehicles/v1');

    await screen.findByRole('button', { name: /book now/i });
    await waitFor(() => expect(useBookingStore.getState().draft.bookingMode).toBe('SELF_DRIVE'));
  });

  it("trusts the dated list, not the single vehicle, on whether it's booked for the chosen dates", async () => {
    // Live 2026-10-13: GET /vehicles/{id} says booked:true for ANY dates once the car has a booking anywhere;
    // GET /vehicles?startTime&endTime answers for exactly that window.
    serve({ ...VEHICLE, booked: true });
    let freeForWindow = true;
    server.use(
      http.get(`${BASE}/vehicles`, ({ request }) => {
        const url = new URL(request.url);
        const dated = url.searchParams.get('startTime') === START && url.searchParams.get('endTime') === END;
        return HttpResponse.json([{ ...VEHICLE, booked: dated ? !freeForWindow : true }]);
      })
    );
    search();
    renderAt('/vehicles/v1');

    const bookNow = await screen.findByRole('button', { name: /book now/i });
    await waitFor(() => expect(bookNow).toBeEnabled());
    expect(screen.queryByText(/already booked for those dates/i)).not.toBeInTheDocument();
  });

  it('still says so when the list reports it booked for those dates', async () => {
    serve();
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json([{ ...VEHICLE, booked: true }])));
    search();
    renderAt('/vehicles/v1');

    expect(await screen.findByText(/already booked for those dates/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /book now/i })).toBeDisabled();
  });

  it('takes a visitor straight to checkout to sign up — no separate contact step', async () => {
    const user = userEvent.setup();
    serve();
    search();
    renderAt('/vehicles/v1');

    await user.click(await screen.findByRole('button', { name: /book now/i }));

    expect(await screen.findByText('checkout')).toBeInTheDocument();
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('collects by default with no fee; delivery needs an address and is kept with the booking', async () => {
    const user = userEvent.setup();
    serve();
    search({ pickupLocation: '' });
    renderAt('/vehicles/v1');

    expect(await screen.findByText(/no fee — you collect it yourself/i)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /^deliver$/i }));
    expect(screen.getByLabelText('Delivery Address')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add to booking/i }));
    expect(useCartStore.getState().items).toEqual([]); // no address yet

    await user.type(screen.getByLabelText('Delivery Address'), 'Westlands, Sarit Centre');
    await user.click(screen.getByRole('button', { name: /add to booking/i }));
    expect(await screen.findByText('the basket')).toBeInTheDocument();
    expect(useCartStore.getState().items[0]).toMatchObject({ deliveryRequested: true, pickupLocation: 'Westlands, Sarit Centre' });
  });

  it('offers a Wedding on a General vehicle, and books it', async () => {
    const user = userEvent.setup();
    serve({ ...VEHICLE, tripTypes: ['GENERAL'] });
    search();
    renderAt('/vehicles/v1');

    await user.click(await screen.findByRole('button', { name: 'Wedding' }));
    await user.click(screen.getByRole('button', { name: /add to booking/i }));

    expect(await screen.findByText('the basket')).toBeInTheDocument();
    expect(useCartStore.getState().items[0]).toMatchObject({ tripType: 'WEDDING' });
  });

  it('takes someone signed in from Book now straight to checkout', async () => {
    const user = userEvent.setup();
    serve();
    signIn('renter@example.com');
    search();
    renderAt('/vehicles/v1');

    await user.click(await screen.findByRole('button', { name: /book now/i }));

    expect(await screen.findByText('checkout')).toBeInTheDocument();
  });
});

describe('VehicleDetailPage details', () => {
  it('shows all the vehicle details: colour, air conditioning, insurance, trip types and availability', async () => {
    serve();
    signIn('renter@example.com');
    renderAt('/vehicles/v1');

    expect(await screen.findByRole('heading', { name: 'Mercedes Benz' })).toBeInTheDocument();
    expect(screen.getByText('Black')).toBeInTheDocument();
    expect(screen.getByText('8 seats')).toBeInTheDocument();
    expect(screen.getByText('Air Conditioning')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive Insurance')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /suited for/i })).toHaveTextContent('WeddingSafari');
    expect(screen.getByText(/available any time/i)).toBeInTheDocument();
  });

  it('shows the dates and times a vehicle is limited to', async () => {
    serve({ ...VEHICLE, availableFrom: '2030-10-01T06:00:00Z', availableTo: '2030-12-01T15:30:00Z' });
    signIn('renter@example.com');
    renderAt('/vehicles/v1');

    expect(await screen.findByText(/available from 01 oct 2030.*until 01 dec 2030/i)).toBeInTheDocument();
  });

  it('keeps the registration number and VIN from renters', async () => {
    serve();
    signIn('renter@example.com');
    renderAt('/vehicles/v1');

    await screen.findByRole('heading', { name: 'Mercedes Benz' });
    expect(screen.queryByText('KDA 123A')).not.toBeInTheDocument();
    expect(screen.queryByText('VIN-SECRET-1')).not.toBeInTheDocument();
  });
});

describe("An owner can't book their own vehicle", () => {
  it('lets a renter add it to their booking', async () => {
    serve();
    signIn('renter@example.com');
    renderAt('/vehicles/v1');

    expect(await screen.findByRole('button', { name: /add to booking/i })).toBeInTheDocument();
  });

  it('replaces the booking form with a note for the owner, and shows them the private details', async () => {
    serve();
    signIn('Owner@Example.com');
    renderAt('/vehicles/v1');

    expect(await screen.findByText(/this is your vehicle, so you can't book it/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add to booking/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /manage it in my vehicles/i })).toHaveAttribute('href', '/owner/vehicles');
    expect(screen.getByText('KDA 123A')).toBeInTheDocument();
    expect(screen.getByText('VIN-SECRET-1')).toBeInTheDocument();
  });

  it('gives the owner an obvious on/off switch for availability, right on their vehicle', async () => {
    const user = userEvent.setup();
    let put;
    server.use(
      http.get(`${BASE}/vehicles/:id`, () => HttpResponse.json(VEHICLE)),
      http.put(`${BASE}/vehicles/:id`, async ({ request }) => {
        put = await request.json();
        return HttpResponse.json({ id: 'v1', ...VEHICLE, ...put });
      })
    );
    signIn('owner@example.com');
    renderAt('/vehicles/v1');

    const toggle = await screen.findByRole('switch', { name: /available for booking/i });
    expect(toggle).toBeChecked();
    await user.click(toggle);

    await waitFor(() => expect(put).toBeDefined());
    expect(put.available).toBe(false);
    expect(put.model).toBe('Mercedes Benz');
  });

  it('does not show the availability switch to a renter', async () => {
    serve();
    signIn('renter@example.com');
    renderAt('/vehicles/v1');

    await screen.findByRole('heading', { name: 'Mercedes Benz' });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('offers no dates or booking form on their own vehicle', async () => {
    serve();
    signIn('owner@example.com');
    renderAt('/vehicles/v1');

    await screen.findByText(/this is your vehicle, so you can't book it/i);
    expect(screen.queryByText(/booking mode/i)).not.toBeInTheDocument();
  });
});

describe('Adding a vehicle to the booking (no account needed)', () => {
  const START = '2026-10-01T09:00:00.000Z';
  const END = '2026-10-04T09:00:00.000Z';

  it('shows the booking form to a visitor, with the price worked out from the days chosen', async () => {
    serve();
    act(() => useBookingStore.getState().setDraft({ vehicleId: 'v1', startTime: START, endTime: END, bookingMode: 'CHAUFFEURED' }));
    renderAt('/vehicles/v1');

    expect(await screen.findByRole('button', { name: /add to booking/i })).toBeInTheDocument();
    expect(screen.getByText('3 days × KES 15,000')).toBeInTheDocument();
    expect(screen.getByText('KES 45,000')).toBeInTheDocument();
  });

  it('puts the vehicle in the selection with its dates and mode, and opens the basket', async () => {
    const user = userEvent.setup();
    serve();
    act(() => useBookingStore.getState().setDraft({ vehicleId: 'v1', startTime: START, endTime: END, bookingMode: 'SELF_DRIVE', tripType: 'WEDDING' }));
    renderAt('/vehicles/v1');

    await user.click(await screen.findByRole('button', { name: /add to booking/i }));

    expect(await screen.findByText('the basket')).toBeInTheDocument();
    const [item] = useCartStore.getState().items;
    expect(item).toMatchObject({ vehicleId: 'v1', startTime: START, endTime: END, bookingMode: 'SELF_DRIVE', tripType: 'WEDDING' });
    expect(item.vehicle).toMatchObject({ model: 'Mercedes Benz', dailyPrice: 15000, ownerEmail: 'owner@example.com' });
    // The owner-only details never go into the visitor's browser storage.
    expect(item.vehicle).not.toHaveProperty('vin');
    expect(item.vehicle).not.toHaveProperty('registrationNumber');
  });

  it('will not add without dates', async () => {
    const user = userEvent.setup();
    serve();
    renderAt('/vehicles/v1');

    await user.click(await screen.findByRole('button', { name: /add to booking/i }));

    expect(useCartStore.getState().items).toEqual([]);
    expect(screen.queryByText('the basket')).not.toBeInTheDocument();
  });

  it('will not add a mode the vehicle does not offer', async () => {
    const user = userEvent.setup();
    serve({ ...VEHICLE, selfDrive: false });
    act(() => useBookingStore.getState().setDraft({ vehicleId: 'v1', startTime: START, endTime: END, bookingMode: 'SELF_DRIVE' }));
    renderAt('/vehicles/v1');

    await user.click(await screen.findByRole('button', { name: /add to booking/i }));

    expect(useCartStore.getState().items).toEqual([]);
  });

  it('starts on the only mode a vehicle offers', async () => {
    serve({ ...VEHICLE, selfDrive: false });
    renderAt('/vehicles/v1');

    await screen.findByRole('button', { name: /add to booking/i });
    await waitFor(() => expect(useBookingStore.getState().draft.bookingMode).toBe('CHAUFFEURED'));
  });

  it('loads a vehicle already in the selection for editing', async () => {
    serve();
    act(() =>
      useCartStore.setState({
        items: [{ vehicleId: 'v1', startTime: START, endTime: END, bookingMode: 'CHAUFFEURED', tripType: null, renterNotes: '', vehicle: { id: 'v1', model: 'Mercedes Benz', dailyPrice: 15000 } }],
      })
    );
    renderAt('/vehicles/v1');

    expect(await screen.findByRole('button', { name: /update booking/i })).toBeInTheDocument();
    expect(screen.getByText('3 days × KES 15,000')).toBeInTheDocument();
  });

  it('shows a note instead of the form for a vehicle that is not available', async () => {
    serve({ ...VEHICLE, available: false });
    renderAt('/vehicles/v1');

    expect(await screen.findByText(/isn't available for booking right now/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add to booking/i })).not.toBeInTheDocument();
  });

  describe('previewing the owner’s rental terms (docs/backend-requests.md item 2)', () => {
    it('offers no preview when the vehicle has no owner id', async () => {
      serve(VEHICLE);
      renderAt('/vehicles/v1');

      await screen.findByRole('button', { name: /add to booking/i });
      expect(screen.queryByRole('button', { name: /preview rental terms/i })).not.toBeInTheDocument();
    });

    it('shows the owner’s terms, read-only, without touching the booking form', async () => {
      const user = userEvent.setup();
      serve({ ...VEHICLE, ownerId: 'owner-1' });
      server.use(
        http.get(`${BASE}/contract-templates/owners/:ownerId/active`, ({ params }) =>
          HttpResponse.json({ id: 't1', ownerId: params.ownerId, content: 'These are the standard rental terms...' })
        )
      );
      renderAt('/vehicles/v1');

      await user.click(await screen.findByRole('button', { name: /preview rental terms/i }));

      expect(await screen.findByText(/these are the standard rental terms/i)).toBeInTheDocument();
      expect(screen.getByText(/preview only/i)).toBeInTheDocument();
      // It's a look, not the binding review — that still happens per booking, right before payment.
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    });
  });
});
