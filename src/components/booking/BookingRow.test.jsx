// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import BookingRow from './BookingRow';
import { stashContractId } from '../../lib/contracts';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderRow(booking, props = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <table>
          <tbody>
            <BookingRow booking={booking} {...props} />
          </tbody>
        </table>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const BOOKING = { id: 'b1', vehicleId: 'v1', vehicleModel: 'Prado', status: 'CONFIRMED', startTime: '2026-10-01T09:00:00Z', endTime: '2026-10-04T09:00:00Z' };

describe('BookingRow — resuming a signature left mid-session', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('offers "Sign contract" once expanded, for a renter, when this session drafted the contract', async () => {
    const user = userEvent.setup();
    stashContractId('b1', 'c1');
    renderRow(BOOKING);

    await user.click(screen.getByRole('button', { name: /view details/i }));

    const link = await screen.findByRole('link', { name: /sign contract/i });
    expect(link).toHaveAttribute('href', '/book/v1/sign');
  });

  it('does not offer it when this session never drafted a contract for the booking', async () => {
    const user = userEvent.setup();
    renderRow(BOOKING);

    await user.click(screen.getByRole('button', { name: /view details/i }));

    expect(await screen.findByText(/booking reference/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign contract/i })).not.toBeInTheDocument();
  });

  it('does not offer it once the booking is completed or cancelled, even with a stashed contract id', async () => {
    const user = userEvent.setup();
    stashContractId('b1', 'c1');
    renderRow({ ...BOOKING, status: 'COMPLETED' });

    await user.click(screen.getByRole('button', { name: /view details/i }));

    expect(await screen.findByText(/booking reference/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign contract/i })).not.toBeInTheDocument();
  });

  it('does not offer it on the owner/admin view, even with a stashed contract id', async () => {
    const user = userEvent.setup();
    stashContractId('b1', 'c1');
    renderRow(BOOKING, { basePath: '/owner/bookings' });

    await user.click(screen.getByRole('button', { name: /view details/i }));

    expect(await screen.findByText(/booking reference/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign contract/i })).not.toBeInTheDocument();
  });
});

describe('BookingRow — handover actions on the renter view', () => {
  it('offers "Record Pickup" once Confirmed, and not on the owner/admin view', async () => {
    const user = userEvent.setup();
    renderRow({ ...BOOKING, status: 'CONFIRMED' });

    await user.click(screen.getByRole('button', { name: /view details/i }));
    expect(screen.getByRole('button', { name: /record pickup/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /record return/i })).not.toBeInTheDocument();
  });

  it('offers "Record Return" once Active instead', async () => {
    const user = userEvent.setup();
    renderRow({ ...BOOKING, status: 'ACTIVE' });

    await user.click(screen.getByRole('button', { name: /view details/i }));
    expect(screen.getByRole('button', { name: /record return/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /record pickup/i })).not.toBeInTheDocument();
  });

  it('offers neither on the owner/admin view — the backend only accepts handover details from the renter', async () => {
    const user = userEvent.setup();
    renderRow({ ...BOOKING, status: 'CONFIRMED' }, { basePath: '/owner/bookings' });

    await user.click(screen.getByRole('button', { name: /view details/i }));
    expect(screen.queryByRole('button', { name: /record pickup/i })).not.toBeInTheDocument();
  });

  it('opens the handover modal on click', async () => {
    const user = userEvent.setup();
    renderRow({ ...BOOKING, status: 'CONFIRMED' });

    await user.click(screen.getByRole('button', { name: /view details/i }));
    await user.click(screen.getByRole('button', { name: /record pickup/i }));
    expect(await screen.findByRole('dialog', { name: /record vehicle pickup/i })).toBeInTheDocument();
  });

  it('disables Record Pickup, with the date it opens up, until the trip\'s own start date actually arrives', async () => {
    const user = userEvent.setup();
    renderRow({ ...BOOKING, status: 'CONFIRMED', startTime: '2099-01-01T09:00:00Z' });

    await user.click(screen.getByRole('button', { name: /view details/i }));
    const button = screen.getByRole('button', { name: /record pickup/i });
    expect(button).toBeDisabled();
    expect(screen.getByText(/from 01 jan 2099/i)).toBeInTheDocument();

    await user.click(button);
    expect(screen.queryByRole('dialog', { name: /record vehicle pickup/i })).not.toBeInTheDocument();
  });
});

describe('BookingRow — the vehicle column', () => {
  it("shows the vehicle's registration number, not the raw vehicleId, once its details load", async () => {
    server.use(http.get(`${BASE}/vehicles/:id`, () => HttpResponse.json({ id: 'v1', model: 'Prado', registrationNumber: 'KDA 123X', photos: [] })));
    renderRow(BOOKING);

    expect(await screen.findByText('KDA 123X')).toBeInTheDocument();
    expect(screen.queryByText('v1')).not.toBeInTheDocument();
  });

  it('falls back to the raw vehicleId only once the vehicle fails to load and no registration is known', async () => {
    server.use(http.get(`${BASE}/vehicles/:id`, () => HttpResponse.json({ message: 'Not found' }, { status: 404 })));
    renderRow(BOOKING);

    expect(await screen.findByText('v1')).toBeInTheDocument();
  });
});

describe('BookingRow — the Contract column (My Bookings only)', () => {
  beforeEach(() => sessionStorage.clear());

  it('is not rendered unless showContract is passed', () => {
    renderRow(BOOKING);
    expect(screen.queryByRole('button', { name: 'Signed PDF' })).not.toBeInTheDocument();
  });

  it('offers to preview and download the Signed PDF once this session drafted the contract', () => {
    stashContractId('b1', 'c1');
    renderRow(BOOKING, { showContract: true });
    expect(screen.getByRole('button', { name: 'Signed PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Signed PDF' })).toBeInTheDocument();
  });

  it('shows a dash when this session has no contract id for the booking', () => {
    renderRow(BOOKING, { showContract: true });
    expect(screen.queryByRole('button', { name: 'Signed PDF' })).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
