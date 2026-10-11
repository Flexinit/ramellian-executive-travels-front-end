// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import BookingDetailPage from './BookingDetailPage';

vi.mock('../components/payment/SignaturePad', () => ({
  default: ({ onChange }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => onChange?.('data:image/png;base64,aGk='), [onChange]);
    return <div data-testid="signature-pad-stub" />;
  },
}));

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderAt(bookingId = 'b1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/dashboard/bookings/${bookingId}`]}>
        <Routes>
          <Route path="/dashboard/bookings/:bookingId" element={<BookingDetailPage />} />
        </Routes>
      </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function serveBooking(overrides = {}) {
  server.use(
    http.get(`${BASE}/bookings/:id`, ({ params }) =>
      HttpResponse.json({ id: params.id, vehicleId: 'v1', status: 'CONFIRMED', numberOfDays: 3, startTime: '2026-10-01T09:00:00Z', endTime: '2026-10-04T09:00:00Z', ...overrides })
    )
  );
}

describe('BookingDetailPage — a booking that no longer holds', () => {
  it('offers Message the owner for a booking that still stands', async () => {
    serveBooking();
    renderAt();

    expect(await screen.findByRole('link', { name: /message the owner/i })).toHaveAttribute('href', '/messages/booking/b1');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains a decline instead, with its own way to message the owner', async () => {
    serveBooking({ status: 'REJECTED', dispatcherNotes: 'Already booked elsewhere for those dates.' });
    renderAt();

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't fulfil this booking/i);
    expect(screen.getByText(/already booked elsewhere/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /message the owner/i })).toHaveAttribute('href', '/messages/booking/b1');
  });

  it('does not use the "couldn’t fulfil this" framing for a booking the renter cancelled themselves', async () => {
    serveBooking({ status: 'CANCELLED' });
    renderAt();

    expect(await screen.findByRole('link', { name: /message the owner/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('BookingDetailPage — Record Pickup only once the trip\'s own start date arrives', () => {
  it('offers it enabled once the pickup date has come', async () => {
    serveBooking({ status: 'CONFIRMED', startTime: '2020-01-01T09:00:00Z' });
    renderAt();

    expect(await screen.findByRole('button', { name: /record pickup/i })).toBeEnabled();
  });

  it('disables it, with the date it opens up, while the trip is still ahead', async () => {
    serveBooking({ status: 'CONFIRMED', startTime: '2099-01-01T09:00:00Z' });
    renderAt();

    expect(await screen.findByRole('button', { name: /record pickup/i })).toBeDisabled();
    expect(screen.getByText(/once your trip starts, on 01 jan 2099/i)).toBeInTheDocument();
  });
});

describe('BookingDetailPage — recording a return leads straight into a review, not just a lower section that needs COMPLETED to show', () => {
  it('opens "How was your trip?" right after the return is saved', async () => {
    const user = userEvent.setup();
    serveBooking({ status: 'ACTIVE' });
    server.use(
      http.post(`${BASE}/handovers/bookings/:bookingId/dropoff`, () =>
        HttpResponse.json({ id: 'ho-1', bookingId: 'b1', type: 'DROPOFF', bookingStatus: 'COMPLETED' })
      )
    );
    renderAt();

    await user.click(await screen.findByRole('button', { name: /record return/i }));
    await user.type(await screen.findByLabelText(/odometer reading/i), '12000');
    await user.selectOptions(screen.getByLabelText(/fuel level/i), 'FULL');
    await user.click(screen.getByRole('button', { name: /confirm return/i }));

    expect(await screen.findByRole('heading', { name: /how was your trip/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send review/i })).toBeInTheDocument();
  });

  it('closes the review prompt once a review is actually sent', async () => {
    const user = userEvent.setup();
    serveBooking({ status: 'ACTIVE' });
    server.use(
      http.post(`${BASE}/handovers/bookings/:bookingId/dropoff`, () =>
        HttpResponse.json({ id: 'ho-1', bookingId: 'b1', type: 'DROPOFF', bookingStatus: 'COMPLETED' })
      ),
      http.post(`${BASE}/reviews/bookings/:bookingId`, () => HttpResponse.json({ id: 'r1', bookingId: 'b1', rating: 5 }))
    );
    renderAt();

    await user.click(await screen.findByRole('button', { name: /record return/i }));
    await user.type(await screen.findByLabelText(/odometer reading/i), '12000');
    await user.selectOptions(screen.getByLabelText(/fuel level/i), 'FULL');
    await user.click(screen.getByRole('button', { name: /confirm return/i }));

    await screen.findByRole('heading', { name: /how was your trip/i });
    await user.click(screen.getByRole('radio', { name: /5 stars/i }));
    await user.click(screen.getByRole('button', { name: /send review/i }));

    await waitFor(() => expect(screen.queryByRole('heading', { name: /how was your trip/i })).not.toBeInTheDocument());
  });
});
