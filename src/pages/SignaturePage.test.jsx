// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useCartStore } from '../store/cartStore';
import { stashContractId } from '../lib/contracts';
import SignaturePage from './SignaturePage';

// The real pad draws to a <canvas>, which jsdom can't render (no `getContext`); this suite is about the
// booking-status gate and group navigation around it, not the drawing itself, so it's stubbed like any
// other environment-fragile widget. It reports a signature so "Submit Signature" is enabled — a real
// (if tiny), validly-padded base64 payload, since `useSignContract` now decodes it with `atob` to upload
// as a file (see `dataUrlToBlob`), which throws on a non-base64 placeholder like a bare "x".
vi.mock('../components/payment/SignaturePad', () => ({
  default: ({ onChange }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => onChange?.('data:image/png;base64,aGk='), [onChange]);
    return <div data-testid="signature-pad-stub" />;
  },
}));

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

// The contract is read part by part (Next…), and only on the last part can "I have read and understood" be
// ticked — which is what makes the signature pad (and its Submit) button appear and work.
async function readToEndAndConfirm() {
  const user = userEvent.setup();
  await screen.findByRole('article', { name: /rental contract/i });
  while (screen.queryByRole('button', { name: /^next/i })) {
    await user.click(screen.getByRole('button', { name: /^next/i }));
  }
  await user.click(await screen.findByLabelText(/i have read and understood this agreement/i));
}

async function submitSignatureButton() {
  await readToEndAndConfirm();
  return screen.findByRole('button', { name: /submit signature/i });
}

// A persistent sibling of whichever route matches — see ContractPage.test.jsx — so a navigation from one
// booking's signature page to the next (same route pattern, different `bookingId`) is still observable.
function LocationProbe() {
  const { pathname } = useLocation();
  return <p data-testid="where">{pathname}</p>;
}

function renderAt(bookingId = 'b1', vehicleId = 'v1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: `/book/${vehicleId}/sign`, state: { bookingId } }]}>
        <LocationProbe />
        <Routes>
          <Route path="/book/:vehicleId/sign" element={<SignaturePage />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

// `BookingResponse` has no `contractId` field on the real backend (docs/backend-requests.md item 13) —
// the booking mock deliberately leaves it off, so these tests catch a regression back to reading it from
// there. What SignaturePage actually reads is sessionStorage (`contract:${bookingId}`), the same stash
// `useContractDraft` writes when a contract is first drafted, seeded here to stand in for that earlier step.
function serveBooking(overrides = {}) {
  server.use(http.get(`${BASE}/bookings/:id`, ({ params }) => HttpResponse.json({ id: params.id, status: 'CONFIRMED', ...overrides })));
}

afterEach(() => sessionStorage.clear());

describe('SignaturePage — a booking that no longer holds', () => {
  it('shows the contract and signature pad for a bookable booking', async () => {
    serveBooking();
    stashContractId('b1', 'c-b1');
    renderAt();

    expect(await submitSignatureButton()).toBeInTheDocument();
  });

  it('shows the decline notice instead of a signature pad if it was rejected after payment', async () => {
    serveBooking({ status: 'REJECTED', dispatcherNotes: 'Turned out to be in for repairs.' });
    stashContractId('b1', 'c-b1');
    renderAt();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't fulfil this booking/i);
    expect(screen.getByText(/turned out to be in for repairs/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit signature/i })).not.toBeInTheDocument();
  });

  it("can't be reached at all if the contract id was never stashed (e.g. a stale link, or reading `booking.contractId`, which the real backend never sends)", async () => {
    serveBooking();
    renderAt();

    expect(await screen.findByText(/could not load your contract/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit signature/i })).not.toBeInTheDocument();
  });
});

describe('SignaturePage — signing a contract that is part of a group (docs/backend-requests.md item 1)', () => {
  const line = (vehicleId, bookingId, extra = {}) => ({
    vehicleId,
    startTime: '2026-10-01T09:00:00Z',
    endTime: '2026-10-04T09:00:00Z',
    bookingMode: 'CHAUFFEURED',
    vehicle: { id: vehicleId, model: vehicleId, dailyPrice: 15000 },
    bookingId,
    contractAccepted: true,
    ...extra,
  });

  afterEach(() => {
    useCartStore.setState({ items: [], contact: null, groupId: null });
  });

  it('moves on to signing the next booking’s own contract, not the confirmation page', async () => {
    const user = userEvent.setup();
    useCartStore.setState({ items: [line('a', 'bk-1'), line('b', 'bk-2')], groupId: 'g1', contact: null });
    serveBooking();
    stashContractId('bk-1', 'c-bk-1');
    stashContractId('bk-2', 'c-bk-2');
    renderAt('bk-1', 'a');

    await user.click(await submitSignatureButton());

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/book/bk-2/sign'));
    expect(useCartStore.getState().items.find((i) => i.bookingId === 'bk-1').signed).toBe(true);
    // Its own contract is fetched afresh, not left showing bk-1's.
    expect(await submitSignatureButton()).toBeInTheDocument();
  });

  it('goes on to the confirmation page once every booking in the group is signed', async () => {
    const user = userEvent.setup();
    useCartStore.setState({ items: [line('a', 'bk-1', { signed: true }), line('b', 'bk-2')], groupId: 'g1', contact: null });
    serveBooking();
    stashContractId('bk-2', 'c-bk-2');
    renderAt('bk-2', 'b');

    await user.click(await submitSignatureButton());

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/book/bk-2/confirm'));
  });
});
