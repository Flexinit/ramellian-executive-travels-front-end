// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import ChangeVehicleModal, { canChangeVehicle } from './ChangeVehicleModal';
import { useAuthStore } from '../../store/authStore';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;
const FUTURE = '2099-10-01T09:00:00.000Z';
const BOOKING = { id: 'b1', vehicleId: 'v1', status: 'CONFIRMED', startTime: FUTURE, endTime: '2099-10-03T09:00:00.000Z' };
const car = (id, model) => ({ id, model, location: 'Nairobi', dailyPrice: 9000, capacity: 5, available: true, photos: [] });

function renderModal(scope = 'renter') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <ChangeVehicleModal booking={BOOKING} scope={scope} isOpen onClose={() => {}} />
    </QueryClientProvider>
  );
}

describe('canChangeVehicle', () => {
  it('allows a pending or confirmed booking whose trip has not started', () => {
    expect(canChangeVehicle(BOOKING)).toBe(true);
    expect(canChangeVehicle({ ...BOOKING, status: 'PENDING' })).toBe(true);
  });
  it('refuses one that has started, finished or been cancelled', () => {
    expect(canChangeVehicle({ ...BOOKING, startTime: '2000-01-01T00:00:00.000Z' })).toBe(false);
    expect(canChangeVehicle({ ...BOOKING, status: 'ACTIVE' })).toBe(false);
    expect(canChangeVehicle({ ...BOOKING, status: 'CANCELLED' })).toBe(false);
    expect(canChangeVehicle(null)).toBe(false);
  });
});

describe('ChangeVehicleModal', () => {
  it("offers a renter the other cars free for the booking's dates, and sends the swap with the reason", async () => {
    const user = userEvent.setup();
    let sent;
    server.use(
      http.get(`${BASE}/vehicles`, () => HttpResponse.json([car('v1', 'Current Car'), car('v2', 'Toyota Prado'), { ...car('v3', 'Taken Car'), booked: true }])),
      http.put(`${BASE}/bookings/b1/change-vehicle`, async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ ...BOOKING, vehicleId: 'v2' });
      })
    );
    renderModal('renter');

    const prado = await screen.findByRole('radio', { name: /toyota prado/i });
    expect(screen.queryByRole('radio', { name: /current car/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /taken car/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^change vehicle$/i })).toBeDisabled();

    await user.click(prado);
    await user.type(screen.getByLabelText(/reason/i), 'Need more seats');
    await user.click(screen.getByRole('button', { name: /^change vehicle$/i }));
    await waitFor(() => expect(sent).toEqual({ vehicleId: 'v2', reason: 'Need more seats' }));
  });

  it("offers an owner their own cars", async () => {
    useAuthStore.setState({ token: 't', user: { id: 'o1', roles: ['OWNER'] } }); // their list loads only when signed in
    server.use(http.get(`${BASE}/vehicles/me`, () => HttpResponse.json([car('v1', 'Current Car'), car('v9', 'My Other Car')])));
    renderModal('owner');
    expect(await screen.findByRole('radio', { name: /my other car/i })).toBeInTheDocument();
  });

  it('says so when there is nothing to switch to', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json([car('v1', 'Current Car')])));
    renderModal('renter');
    expect(await screen.findByText(/no other vehicle to switch to/i)).toBeInTheDocument();
  });
});
