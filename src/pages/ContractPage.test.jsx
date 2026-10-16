// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useCartStore } from '../store/cartStore';
import ContractPage from './ContractPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

// The contract is read part by part (Next…), and only on the last part can "I have read and understood" be
// ticked — which is what makes the Accept & Continue button appear and work.
async function readToEndAndConfirm() {
  const user = userEvent.setup();
  await screen.findByRole('article', { name: /rental contract/i });
  while (screen.queryByRole('button', { name: /^next/i })) {
    await user.click(screen.getByRole('button', { name: /^next/i }));
  }
  await user.click(await screen.findByLabelText(/i have read and understood this agreement/i));
}

async function acceptButton() {
  await readToEndAndConfirm();
  return screen.findByRole('button', { name: /accept & continue/i });
}

// A persistent sibling of whichever route matches — not a competing route — so a navigation from one
// booking's contract to the *next* booking's contract (same route pattern, same ContractPage instance,
// different `bookingId`) is still observable: no fallback route would ever win against ContractPage there.
function LocationProbe() {
  const { pathname } = useLocation();
  return <p data-testid="where">{pathname}</p>;
}

function renderAt(bookingId = 'b1', vehicleId = 'v1', warnings) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: `/book/${vehicleId}/contract`, state: { bookingId, warnings } }]}>
        <LocationProbe />
        <Routes>
          <Route path="/book/:vehicleId/contract" element={<ContractPage />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function serveBooking(overrides = {}) {
  server.use(http.get(`${BASE}/bookings/:id`, ({ params }) => HttpResponse.json({ id: params.id, status: 'CONFIRMED', ...overrides })));
}

describe('ContractPage — a booking that no longer holds', () => {
  it('shows the contract and lets a bookable booking be accepted', async () => {
    serveBooking();
    renderAt();

    expect(await acceptButton()).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows why the owner declined it, instead of letting the contract be accepted', async () => {
    serveBooking({ status: 'REJECTED', dispatcherNotes: 'Already out on another trip that week.' });
    renderAt();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't fulfil this booking/i);
    expect(screen.getByText(/already out on another trip/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept & continue/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /message the owner/i })).toHaveAttribute('href', '/messages/booking/b1');
    expect(screen.getByRole('link', { name: /browse other vehicles/i })).toHaveAttribute('href', '/vehicles');
  });

  it('explains an expired hold the same way', async () => {
    serveBooking({ status: 'EXPIRED' });
    renderAt();

    expect(await screen.findByRole('alert')).toHaveTextContent(/hold ran out/i);
  });

  it('leaves a booking the renter cancelled themselves alone', async () => {
    serveBooking({ status: 'CANCELLED' });
    renderAt();

    await screen.findByText(/preparing contract|your rental contract/i);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('ContractPage — revisited after its contract was already accepted', () => {
  function serveAlreadyPastContract(bookingStatus) {
    server.use(
      http.get(`${BASE}/bookings/:id`, ({ params }) => HttpResponse.json({ id: params.id, status: bookingStatus })),
      http.post(
        `${BASE}/payments/bookings/:bookingId/contract/draft`,
        () => HttpResponse.json({ message: 'A contract draft can only be created for a pending booking' }, { status: 400 })
      )
    );
  }

  it('offers to continue to payment instead of a "Try again" that can only fail the same way', async () => {
    serveAlreadyPastContract('CONFIRMED');
    renderAt();

    expect(await screen.findByRole('link', { name: /continue to payment/i })).toHaveAttribute('href', '/book/b1/payment');
    expect(screen.queryByText(/could not prepare your contract/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('says the booking was cancelled instead, when that is why', async () => {
    serveAlreadyPastContract('CANCELLED');
    renderAt();

    expect(await screen.findByText(/this booking was cancelled/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse other vehicles/i })).toHaveAttribute('href', '/vehicles');
  });

  it('also treats a raw "duplicate key" DB error as already handled, not a broken retry (docs/backend-requests.md item 19)', async () => {
    server.use(
      http.get(`${BASE}/bookings/:id`, ({ params }) => HttpResponse.json({ id: params.id, status: 'CONFIRMED' })),
      http.post(
        `${BASE}/payments/bookings/:bookingId/contract/draft`,
        () =>
          HttpResponse.json(
            {
              message:
                '[org.springframework.dao.DataIntegrityViolationException] could not execute statement ' +
                '[ERROR: duplicate key value violates unique constraint "ukoageowo07ggdo2qdjt6cebks7" ' +
                'Detail: Key (booking_id)=(32e78702-e32c-434c-95e2-ae8505a7abea) already exists.]',
            },
            { status: 500 }
          )
      )
    );
    renderAt();

    expect(await screen.findByRole('link', { name: /continue to payment/i })).toHaveAttribute('href', '/book/b1/payment');
    expect(screen.queryByText(/could not prepare your contract/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/DataIntegrityViolationException/i)).not.toBeInTheDocument();
  });
});

describe('ContractPage — the booking\'s own warnings (docs/backend-requests.md item 29\'s follow-up)', () => {
  it("shows the backend's warnings once, right away — a booking made before documents were approved", async () => {
    serveBooking();
    renderAt('b1', 'v1', ['Upload your ID before pickup.']);

    expect(await screen.findByText(/before you pick up/i)).toBeInTheDocument();
    expect(screen.getByText('Upload your ID before pickup.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /upload documents now/i })).toHaveAttribute('href', '/dashboard/documents');
  });

  it('shows nothing when there are no warnings — the ordinary case', async () => {
    serveBooking();
    renderAt('b1', 'v1', []);

    await acceptButton();
    expect(screen.queryByText(/before you pick up/i)).not.toBeInTheDocument();
  });

  it('can be dismissed with "I\'ll Do It Later", without blocking the contract underneath', async () => {
    const user = userEvent.setup();
    serveBooking();
    renderAt('b1', 'v1', ['Upload your driving licence before pickup.']);

    await user.click(await screen.findByRole('button', { name: /i'll do it later/i }));

    expect(screen.queryByText(/before you pick up/i)).not.toBeInTheDocument();
    expect(await acceptButton()).toBeInTheDocument();
  });
});

describe('ContractPage — accepting a contract that is part of a group (docs/backend-requests.md item 1)', () => {
  const line = (vehicleId, bookingId, extra = {}) => ({
    vehicleId,
    startTime: '2026-10-01T09:00:00Z',
    endTime: '2026-10-04T09:00:00Z',
    bookingMode: 'CHAUFFEURED',
    vehicle: { id: vehicleId, model: vehicleId, dailyPrice: 15000 },
    bookingId,
    ...extra,
  });

  afterEach(() => {
    useCartStore.setState({ items: [], contact: null, groupId: null });
  });

  it('moves on to the next booking’s contract, not payment, while others in the group still need theirs accepted', async () => {
    const user = userEvent.setup();
    useCartStore.setState({ items: [line('a', 'bk-1'), line('b', 'bk-2')], groupId: 'g1', contact: null });
    serveBooking({ status: 'CONFIRMED' });
    renderAt('bk-1', 'a');

    await user.click(await acceptButton());

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/book/bk-2/contract'));
    expect(useCartStore.getState().items.find((i) => i.bookingId === 'bk-1').contractAccepted).toBe(true);
    // Its own draft is requested afresh — the same page must not get stuck showing booking bk-1's contract.
    expect(await acceptButton()).toBeInTheDocument();
  });

  it('goes on to the group’s combined payment once every booking’s contract is accepted', async () => {
    const user = userEvent.setup();
    useCartStore.setState({
      items: [line('a', 'bk-1', { contractAccepted: true }), line('b', 'bk-2')],
      groupId: 'g1',
      contact: null,
    });
    serveBooking({ status: 'CONFIRMED' });
    renderAt('bk-2', 'b');

    await user.click(await acceptButton());

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/book/group/g1/payment'));
  });
});
