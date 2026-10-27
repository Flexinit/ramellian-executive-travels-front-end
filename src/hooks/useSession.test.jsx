// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { apiGet } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useIdleWarning, useTokenRefresh } from './useSession';
import IdleSignOutModal from '../components/auth/IdleSignOutModal';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function jwt(payload) {
  const part = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${part({ alg: 'HS384' })}.${part({ userId: 'u1', email: 'a@example.com', roles: ['RENTER'], ...payload })}.sig`;
}
const inSeconds = (s) => Math.floor(Date.now() / 1000) + s;

beforeEach(() => {
  useAuthStore.getState().clearAuth();
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('renewing the session (POST /auth/refresh)', () => {
  it('renews an expired token and sends the request again — the person never notices', async () => {
    const old = jwt({ exp: inSeconds(-10) });
    const fresh = jwt({ exp: inSeconds(900) });
    useAuthStore.getState().setToken(old, 'refresh-1');
    const refreshBodies = [];
    server.use(
      http.get(`${BASE}/things`, ({ request }) =>
        request.headers.get('Authorization') === `Bearer ${fresh}` ? HttpResponse.json({ ok: true }) : HttpResponse.json({ message: 'Token has expired' }, { status: 401 })),
      http.post(`${BASE}/auth/refresh`, async ({ request }) => {
        refreshBodies.push({ body: await request.json(), auth: request.headers.get('Authorization') });
        return HttpResponse.json({ accessToken: fresh, refreshToken: 'refresh-2', expiresIn: 900 });
      })
    );
    const expired = vi.fn();
    window.addEventListener('auth:expired', expired);

    await expect(apiGet('/things')).resolves.toEqual({ ok: true });
    // The refresh carries the refresh token — and not the expired access token, which the backend would refuse.
    expect(refreshBodies).toEqual([{ body: { refreshToken: 'refresh-1' }, auth: null }]);
    expect(useAuthStore.getState().token).toBe(fresh);
    expect(useAuthStore.getState().refreshToken).toBe('refresh-2');
    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener('auth:expired', expired);
  });

  it('renews once for several requests refused at the same time', async () => {
    const fresh = jwt({ exp: inSeconds(900) });
    useAuthStore.getState().setToken(jwt({ exp: inSeconds(-10) }), 'refresh-1');
    let refreshes = 0;
    server.use(
      http.get(`${BASE}/things/:n`, ({ request }) =>
        request.headers.get('Authorization') === `Bearer ${fresh}` ? HttpResponse.json({ ok: true }) : new HttpResponse(null, { status: 401 })),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshes += 1;
        return HttpResponse.json({ accessToken: fresh, refreshToken: 'refresh-2' });
      })
    );

    await Promise.all([apiGet('/things/1'), apiGet('/things/2'), apiGet('/things/3')]);
    expect(refreshes).toBe(1);
  });

  it('asks to log in again only when the refresh itself is refused', async () => {
    useAuthStore.getState().setToken(jwt({ exp: inSeconds(-10) }), 'refresh-1');
    server.use(
      http.get(`${BASE}/things`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ message: 'Refresh token expired' }, { status: 401 }))
    );
    const expired = vi.fn();
    window.addEventListener('auth:expired', expired);

    await expect(apiGet('/things')).rejects.toBeTruthy();
    expect(expired).toHaveBeenCalledTimes(1);
    expect(expired.mock.calls[0][0].detail.isSessionCheck).toBe(true);
    window.removeEventListener('auth:expired', expired);
  });

  it('revokes the refresh token when signing out (POST /auth/logout)', async () => {
    let body;
    server.use(http.post(`${BASE}/auth/logout`, async ({ request }) => {
      body = await request.json();
      return new HttpResponse(null, { status: 200 });
    }));
    useAuthStore.getState().setToken(jwt({ exp: inSeconds(900) }), 'refresh-9');
    useAuthStore.getState().clearAuth();

    await waitFor(() => expect(body).toEqual({ refreshToken: 'refresh-9' }));
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });

  it('renews the token a minute before it expires', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fresh = jwt({ exp: inSeconds(3600) });
    let refreshed = false;
    server.use(http.post(`${BASE}/auth/refresh`, () => {
      refreshed = true;
      return HttpResponse.json({ accessToken: fresh, refreshToken: 'refresh-2' });
    }));
    useAuthStore.getState().setToken(jwt({ exp: inSeconds(5 * 60) }), 'refresh-1');
    renderHook(() => useTokenRefresh());

    await act(async () => { vi.advanceTimersByTime(3 * 60_000); });
    expect(refreshed).toBe(false);
    await act(async () => { vi.advanceTimersByTime(60_000 + 1_000); });
    await waitFor(() => expect(useAuthStore.getState().token).toBe(fresh));
  });
});

describe('signing out after being idle', () => {
  it('starts the countdown after the idle time with no activity; Stay signed in ends it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useAuthStore.getState().setToken(jwt({ exp: inSeconds(3600) }), 'refresh-1');
    const { result } = renderHook(() => useIdleWarning({ idleMs: 10_000 }));

    await act(async () => { vi.advanceTimersByTime(6_000); });
    act(() => { window.dispatchEvent(new Event('keydown')); });
    await act(async () => { vi.advanceTimersByTime(6_000); });
    expect(result.current.warningSince).toBeNull(); // the key press counted as activity

    await act(async () => { vi.advanceTimersByTime(6_000); });
    expect(result.current.warningSince).not.toBeNull();

    act(() => result.current.stay());
    expect(result.current.warningSince).toBeNull();
  });

  it('signs out when the countdown ends', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useAuthStore.getState().setToken(jwt({ exp: inSeconds(3600) }), 'refresh-1');
    // Last used in this browser over half an hour ago.
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="/dashboard" element={<IdleSignOutModal />} />
            <Route path="/auth/login" element={<p>Login page</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    await act(async () => { vi.advanceTimersByTime(30 * 60_000 + 2_000); });
    expect(await screen.findByText('Are you still there?')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(61_000); });
    expect(await screen.findByText('Login page')).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('Stay signed in keeps the person signed in', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    useAuthStore.getState().setToken(jwt({ exp: inSeconds(3600) }), 'refresh-1');
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <IdleSignOutModal />
        </MemoryRouter>
      </QueryClientProvider>
    );
    await act(async () => { vi.advanceTimersByTime(30 * 60_000 + 2_000); });
    await user.click(await screen.findByRole('button', { name: 'Stay signed in' }));
    await act(async () => { vi.advanceTimersByTime(61_000); });
    expect(screen.queryByText('Are you still there?')).not.toBeInTheDocument();
    expect(useAuthStore.getState().token).not.toBeNull();
  });
});
