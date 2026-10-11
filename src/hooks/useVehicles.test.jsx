// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import toast from 'react-hot-toast';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import { rememberOwnVehicle, rememberPhoto } from '../lib/vehiclePhotos';
import {
  normalizeVehicle,
  useVehicle,
  useVehicles,
  useVehicleAvailability,
  useVehicleWindowBooked,
  useMyVehicles,
  useAdminVehicles,
  useReviewVehicle,
  useCreateVehicle,
  useUploadVehiclePhoto,
  vehicleToRequest,
  buildVehicleRequest,
  useSetVehicleAvailability,
} from './useVehicles';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function wrapper({ children }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const VEHICLE = { id: 'v1', model: 'Toyota Prado', pricePerDay: 15000, ownerEmail: 'owner@example.com', available: true };

beforeEach(() => {
  act(() => useAuthStore.setState({ token: 'test-token', user: { id: 'u1', email: 'owner@example.com', roles: ['OWNER'] } }));
});
afterEach(() => {
  act(() => useAuthStore.getState().clearAuth());
});

describe('normalizeVehicle', () => {
  it("aliases the backend's pricePerDay as dailyPrice, which the display components read", () => {
    expect(normalizeVehicle({ id: 'v1', pricePerDay: 8000 }).dailyPrice).toBe(8000);
  });

  it('attaches the photos remembered from uploads, resolved to full URLs', () => {
    rememberPhoto('v1', { id: 'p1', url: '/uploads/vehicles/a.png' }, 'front');
    expect(normalizeVehicle({ id: 'v1' }).photos).toEqual([
      { id: 'p1', url: `${import.meta.env.VITE_API_BASE_URL}/uploads/vehicles/a.png`, alt: 'Front view' },
    ]);
  });

  it('prefers photos the server sends over remembered ones (for when the backend adds them)', () => {
    rememberPhoto('v1', { id: 'p1', url: '/uploads/vehicles/old.png' }, 'front');
    const v = normalizeVehicle({ id: 'v1', photos: [{ url: '/uploads/vehicles/server.png' }, 'https://cdn.example.com/b.png'] });
    expect(v.photos.map((p) => p.url)).toEqual([`${import.meta.env.VITE_API_BASE_URL}/uploads/vehicles/server.png`, 'https://cdn.example.com/b.png']);
  });

  it('gives a vehicle with no photos an empty list', () => {
    expect(normalizeVehicle({ id: 'v1' }).photos).toEqual([]);
  });
});

describe('reading vehicles', () => {
  it('useVehicle returns the vehicle with its remembered photos attached', async () => {
    rememberPhoto('v1', { id: 'p1', url: '/uploads/vehicles/a.png' }, 'front');
    server.use(http.get(`${BASE}/vehicles/v1`, () => HttpResponse.json(VEHICLE)));

    const { result } = renderHook(() => useVehicle('v1'), { wrapper });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.photos).toHaveLength(1);
    expect(result.current.data.dailyPrice).toBe(15000);
  });

  it('useVehicles normalises both a plain array and a paged response', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json([VEHICLE])));
    const { result } = renderHook(() => useVehicles(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data[0].dailyPrice).toBe(15000);

    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json({ content: [VEHICLE], totalElements: 1 })));
    const paged = renderHook(() => useVehicles({ page: 1 }), { wrapper });
    await waitFor(() => expect(paged.result.current.data).toBeTruthy());
    expect(paged.result.current.data.content[0].dailyPrice).toBe(15000);
  });
});

describe('available vs unavailable vehicles', () => {
  const OFF = { ...VEHICLE, id: 'v-off', model: 'Parked Noah', available: false };

  it('the public search / fleet list drops vehicles marked unavailable', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json([VEHICLE, OFF])));
    const { result } = renderHook(() => useVehicles(), { wrapper });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.map((v) => v.id)).toEqual(['v1']);
  });

  it('drops them from a paged response too', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json({ content: [VEHICLE, OFF], totalElements: 2 })));
    const { result } = renderHook(() => useVehicles({ page: 1 }), { wrapper });

    await waitFor(() => expect(result.current.data).toBeTruthy());
    expect(result.current.data.content.map((v) => v.id)).toEqual(['v1']);
  });

  it("an owner's own list keeps their unavailable vehicles", async () => {
    server.use(http.get(`${BASE}/vehicles/me`, () => HttpResponse.json([VEHICLE, OFF])));
    const { result } = renderHook(() => useMyVehicles(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.vehicles.map((v) => v.id).sort()).toEqual(['v-off', 'v1']);
  });
});

describe('useVehicleAvailability', () => {
  const BOOKED = { ...VEHICLE, id: 'v-booked', model: 'Taken Prado', booked: true };

  it("keeps a booked vehicle in the list, marked isBooked, rather than dropping it like the backend's own date filter would", async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json([VEHICLE, BOOKED])));
    const { result } = renderHook(() => useVehicleAvailability({ startTime: '2026-10-01T09:00:00Z', endTime: '2026-10-02T09:00:00Z' }), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const byId = Object.fromEntries(result.current.vehicles.map((v) => [v.id, v.isBooked]));
    expect(byId).toEqual({ v1: false, 'v-booked': true });
  });

  it('marks nothing booked until dates are chosen, since the flag then only means "booked some time"', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json([VEHICLE, BOOKED])));
    const { result } = renderHook(() => useVehicleAvailability(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.vehicles.map((v) => v.isBooked)).toEqual([false, false]);
    expect(result.current.hasDates).toBe(false);
  });

  it('reports hasDates from whether startTime/endTime were passed', async () => {
    server.use(http.get(`${BASE}/vehicles`, () => HttpResponse.json([VEHICLE])));
    const { result } = renderHook(() => useVehicleAvailability({ startTime: '2026-10-01T09:00:00Z', endTime: '2026-10-02T09:00:00Z' }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasDates).toBe(true);
  });
});

describe('useVehicleWindowBooked', () => {
  it('reads the booked flag for one vehicle and window from GET /vehicles/{id}', async () => {
    server.use(http.get(`${BASE}/vehicles/v1`, () => HttpResponse.json({ ...VEHICLE, booked: true })));
    const { result } = renderHook(() => useVehicleWindowBooked('v1', '2026-10-01T09:00:00Z', '2026-10-02T09:00:00Z'), { wrapper });
    await waitFor(() => expect(result.current.isBooked).toBe(true));
  });

  it('stays disabled until a vehicle id and both dates are given', () => {
    const { result } = renderHook(() => useVehicleWindowBooked(undefined, undefined, undefined), { wrapper });
    expect(result.current.isBooked).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useMyVehicles', () => {
  it("lists the signed-in owner's vehicles from GET /vehicles/me — including switched-off and unapproved ones", async () => {
    server.use(
      http.get(`${BASE}/vehicles/me`, () =>
        HttpResponse.json([VEHICLE, { ...VEHICLE, id: 'v-off', available: false, approvalStatus: 'PENDING' }, { ...VEHICLE, id: 'v-old', approvalStatus: null }])
      )
    );
    const { result } = renderHook(() => useMyVehicles(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.vehicles.map((v) => v.id)).toEqual(['v1', 'v-off', 'v-old']);
  });

  it('shapes each vehicle for display, like every other vehicle list', async () => {
    server.use(http.get(`${BASE}/vehicles/me`, () => HttpResponse.json([VEHICLE])));
    const { result } = renderHook(() => useMyVehicles(), { wrapper });

    await waitFor(() => expect(result.current.vehicles).toHaveLength(1));
    expect(result.current.vehicles[0].dailyPrice).toBe(15000);
  });

  it('reports a failure so the page can say so', async () => {
    server.use(http.get(`${BASE}/vehicles/me`, () => new HttpResponse(null, { status: 500 })));
    const { result } = renderHook(() => useMyVehicles(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.vehicles).toEqual([]);
  });
});

describe('useAdminVehicles', () => {
  it('reads every vehicle from GET /vehicles/admin/all, asking for a status only when one is chosen', async () => {
    const asked = [];
    server.use(
      http.get(`${BASE}/vehicles/admin/all`, ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('status'));
        return HttpResponse.json([VEHICLE]);
      })
    );
    const all = renderHook(() => useAdminVehicles(), { wrapper });
    await waitFor(() => expect(all.result.current.data).toHaveLength(1));
    const pending = renderHook(() => useAdminVehicles('PENDING'), { wrapper });
    await waitFor(() => expect(pending.result.current.data).toHaveLength(1));
    expect(asked).toEqual([null, 'PENDING']);
  });
});

describe('useReviewVehicle', () => {
  it('approves with PUT /vehicles/admin/{id}/review and sends the note', async () => {
    let body;
    server.use(
      http.put(`${BASE}/vehicles/admin/v1/review`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...VEHICLE, approvalStatus: 'APPROVED' });
      })
    );
    const { result } = renderHook(() => useReviewVehicle(), { wrapper });
    act(() => result.current.mutate({ vehicle: VEHICLE, status: 'APPROVED', notes: 'Looks good' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(body).toEqual({ status: 'APPROVED', notes: 'Looks good' });
  });

  it('uses the non-admin review path when asked to', async () => {
    let hit = false;
    server.use(http.put(`${BASE}/vehicles/v1/review`, () => { hit = true; return HttpResponse.json({ ...VEHICLE, approvalStatus: 'REJECTED' }); }));
    const { result } = renderHook(() => useReviewVehicle(), { wrapper });
    act(() => result.current.mutate({ vehicle: VEHICLE, status: 'REJECTED', asAdmin: false }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(hit).toBe(true);
  });

  it("doesn't call it done when the answer doesn't carry the decision", async () => {
    server.use(http.put(`${BASE}/vehicles/admin/v1/review`, () => HttpResponse.json({ ...VEHICLE, approvalStatus: 'PENDING' })));
    const { result } = renderHook(() => useReviewVehicle(), { wrapper });
    act(() => result.current.mutate({ vehicle: VEHICLE, status: 'APPROVED' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('remembering what was created and uploaded', () => {
  it('remembers a created vehicle for its owner', async () => {
    const { result } = renderHook(() => useCreateVehicle(), { wrapper });
    act(() => result.current.mutate({ model: 'X' }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The default mock answers with id "new-vehicle-id".
    const { getOwnVehicleIds } = await import('../lib/vehiclePhotos');
    expect(getOwnVehicleIds('u1')).toEqual(['new-vehicle-id']);
  });

  it("remembers an uploaded photo's URL and angle from the upload response", async () => {
    server.use(
      http.post(`${BASE}/vehicles/:id/photos`, () =>
        HttpResponse.json({ id: 'p1', fileName: 'uuid.png', contentType: 'image/png', url: '/uploads/vehicles/uuid.png' })
      )
    );
    const { result } = renderHook(() => useUploadVehiclePhoto(), { wrapper });
    act(() => result.current.mutate({ vehicleId: 'v1', file: new File(['x'], 'left.png', { type: 'image/png' }) }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(normalizeVehicle({ id: 'v1' }).photos).toEqual([
      { id: 'p1', url: `${import.meta.env.VITE_API_BASE_URL}/uploads/vehicles/uuid.png`, alt: 'Left side view' },
    ]);
  });
});

describe('vehicleToRequest', () => {
  it('rebuilds the VehicleRequest a vehicle needs for PUT, from its response', () => {
    expect(
      vehicleToRequest({
        id: 'v1', model: 'Prado', vin: 'V', registrationNumber: 'R', location: 'Nairobi', pricePerDay: 15000, capacity: 5,
        color: 'White', fuelType: 'DIESEL', transmissionType: 'AUTOMATIC', selfDrive: true, chauffeured: false, tripTypes: ['SAFARI'],
        available: true, rating: 4, ownerEmail: 'o@example.com', photos: [],
      })
    ).toEqual({
      model: 'Prado', vin: 'V', registrationNumber: 'R', location: 'Nairobi', pricePerDay: 15000, capacity: 5,
      color: 'White', fuelType: 'DIESEL', transmissionType: 'AUTOMATIC', selfDrive: true, chauffeured: false, tripTypes: ['SAFARI'],
      available: true, hasWorkingAC: false, comprehensiveInsurance: false,
    });
  });

  it('carries the availability window and the feature flags so a PUT does not wipe them', () => {
    const request = vehicleToRequest({
      model: 'X', available: false, availableFrom: '2026-10-01T06:00:00Z', availableTo: '2026-12-01T06:00:00Z',
      hasWorkingAC: true, comprehensiveInsurance: false, insuranceVerificationStickerPhoto: 'sticker.png',
    });
    expect(request).toMatchObject({
      available: false, availableFrom: '2026-10-01T06:00:00Z', availableTo: '2026-12-01T06:00:00Z',
      hasWorkingAC: true, comprehensiveInsurance: false, insuranceVerificationStickerPhoto: 'sticker.png',
    });
  });

  it('uses the dailyPrice alias when only that is present, and drops missing fields', () => {
    const request = vehicleToRequest({ model: 'X', dailyPrice: 900 });
    expect(request.pricePerDay).toBe(900);
    expect(request).not.toHaveProperty('capacity');
    expect(request.tripTypes).toEqual([]);
  });

  it('always sends available, hasWorkingAC and comprehensiveInsurance as booleans — the live backend answers 400 without them', () => {
    expect(vehicleToRequest({ model: 'X' })).toMatchObject({ available: false, hasWorkingAC: false, comprehensiveInsurance: false });
    expect(vehicleToRequest({ model: 'X', available: true, hasWorkingAC: null, comprehensiveInsurance: true })).toMatchObject({
      available: true,
      hasWorkingAC: false,
      comprehensiveInsurance: true,
    });
  });
});

describe('buildVehicleRequest', () => {
  it('converts the availability window to ISO date-times and drops blank optional fields', () => {
    const request = buildVehicleRequest({ model: 'X', availableFrom: '2026-10-01T09:00', availableTo: '', tripTypes: [], hasWorkingAC: true });
    expect(request.availableFrom).toBe(new Date('2026-10-01T09:00').toISOString());
    expect(request).not.toHaveProperty('availableTo');
    expect(request).toMatchObject({ model: 'X', tripTypes: [], hasWorkingAC: true });
  });
});

describe('buildVehicleRequest availability', () => {
  it('drops any dates when the owner chose "always available", and never sends the mode itself', () => {
    const request = buildVehicleRequest({ model: 'X', availabilityMode: 'always', availableFrom: '2026-10-01T09:00', availableTo: '2026-11-01T09:00' });
    expect(request).not.toHaveProperty('availableFrom');
    expect(request).not.toHaveProperty('availableTo');
    expect(request).not.toHaveProperty('availabilityMode');
  });

  it('sends both dates as ISO date-times when the owner chose specific dates', () => {
    const request = buildVehicleRequest({ model: 'X', availabilityMode: 'dates', availableFrom: '2026-10-01T09:00', availableTo: '2026-11-01T18:30' });
    expect(request.availableFrom).toBe(new Date('2026-10-01T09:00').toISOString());
    expect(request.availableTo).toBe(new Date('2026-11-01T18:30').toISOString());
  });
});

describe('useSetVehicleAvailability', () => {
  const FULL = {
    id: 'v1', model: 'Prado', vin: 'V', registrationNumber: 'R', location: 'Nairobi', pricePerDay: 15000, capacity: 5,
    color: 'White', fuelType: 'DIESEL', transmissionType: 'AUTOMATIC', selfDrive: true, chauffeured: false, tripTypes: [], available: true,
  };

  it('sends PUT /vehicles/{id} with the vehicle\'s own details and the new availability', async () => {
    let body;
    server.use(
      http.put(`${BASE}/vehicles/v1`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...FULL, available: body.available });
      })
    );
    const { result } = renderHook(() => useSetVehicleAvailability(), { wrapper });

    act(() => result.current.mutate({ vehicle: FULL, available: false }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(body).toMatchObject({ model: 'Prado', vin: 'V', registrationNumber: 'R', pricePerDay: 15000, capacity: 5, available: false });
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('ownerEmail');
  });

  it('reports a failure instead of pretending it worked', async () => {
    server.use(http.put(`${BASE}/vehicles/v1`, () => HttpResponse.json({ message: 'An unexpected error occurred' }, { status: 500 })));
    const { result } = renderHook(() => useSetVehicleAvailability(), { wrapper });

    act(() => result.current.mutate({ vehicle: FULL, available: false }));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  // The list and the toggle share one query cache, the way the My Vehicles page does.
  const listAndToggle = () =>
    renderHook(() => ({ list: useVehicles({}, { includeUnavailable: true }), toggle: useSetVehicleAvailability() }), { wrapper });

  it('moves the switch straight away, before the server has answered', async () => {
    let release;
    server.use(
      http.get(`${BASE}/vehicles`, () => HttpResponse.json([FULL])),
      http.put(`${BASE}/vehicles/v1`, async () => {
        await new Promise((resolve) => { release = resolve; });
        return HttpResponse.json({ ...FULL, available: false });
      })
    );
    const { result } = listAndToggle();
    await waitFor(() => expect(result.current.list.data?.[0]?.available).toBe(true));

    act(() => result.current.toggle.mutate({ vehicle: FULL, available: false }));

    await waitFor(() => expect(result.current.list.data[0].available).toBe(false));
    expect(result.current.toggle.isPending).toBe(true);
    release();
    await waitFor(() => expect(result.current.toggle.isSuccess).toBe(true));
  });

  it('puts the switch back if the request fails', async () => {
    server.use(
      http.get(`${BASE}/vehicles`, () => HttpResponse.json([FULL])),
      http.put(`${BASE}/vehicles/v1`, () => HttpResponse.json({ message: 'boom' }, { status: 500 }))
    );
    const { result } = listAndToggle();
    await waitFor(() => expect(result.current.list.data?.[0]?.available).toBe(true));

    act(() => result.current.toggle.mutate({ vehicle: FULL, available: false }));
    await waitFor(() => expect(result.current.toggle.isError).toBe(true));

    await waitFor(() => expect(result.current.list.data[0].available).toBe(true));
  });

  it('tells the owner, and puts the switch back, when the server says OK but ignores the change', async () => {
    const errorToast = vi.spyOn(toast, 'error');
    server.use(
      http.get(`${BASE}/vehicles`, () => HttpResponse.json([FULL])),
      // 200, but `available` comes back unchanged.
      http.put(`${BASE}/vehicles/v1`, () => HttpResponse.json({ ...FULL, available: true }))
    );
    const { result } = listAndToggle();
    await waitFor(() => expect(result.current.list.data?.[0]?.available).toBe(true));

    act(() => result.current.toggle.mutate({ vehicle: FULL, available: false }));
    await waitFor(() => expect(result.current.toggle.isSuccess).toBe(true));

    expect(errorToast).toHaveBeenCalledWith(expect.stringMatching(/server didn't change prado's availability.*still available/i));
    await waitFor(() => expect(result.current.list.data[0].available).toBe(true));
    errorToast.mockRestore();
  });
});
