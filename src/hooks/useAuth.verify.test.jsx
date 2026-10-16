// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useRegister, useVerifyEmail } from './useAuth';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;
const EMAIL = 'ann@example.com';

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function Harness() {
  const register = useRegister();
  const verify = useVerifyEmail();
  return (
    <>
      <button onClick={() => register.mutate({ email: EMAIL, password: 'secret123', firstName: 'Ann', lastName: 'K' })}>register</button>
      <button onClick={() => verify.mutate({ email: EMAIL, code: '123456' })}>verify</button>
      <Where />
    </>
  );
}

function renderHarness() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/auth/register']}>
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

let logins;
beforeEach(() => {
  logins = [];
  useAuthStore.getState().clearAuth();
  server.use(
    http.post(`${BASE}/auth/register`, () => HttpResponse.json({})),
    http.post(`${BASE}/auth/verify-email`, () => new HttpResponse(null, { status: 200 })),
    http.post(`${BASE}/auth/login`, async ({ request }) => {
      logins.push(await request.json());
      return HttpResponse.json({ message: 'stop here' }, { status: 401 });
    })
  );
});

describe('verifying right after registering', () => {
  it('signs in with the password just typed, instead of sending them to log in again', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByText('register'));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/auth/verify-email'));
    await user.click(screen.getByText('verify'));

    await waitFor(() => expect(logins).toEqual([{ email: EMAIL, password: 'secret123' }]));
  });

  it('lands back on checkout, signed in, when a booking is waiting', async () => {
    server.use(http.post(`${BASE}/auth/login`, () => HttpResponse.json({ tokenType: 'Bearer', accessToken: 'x.eyJzdWIiOiJ1MSIsInJvbGVzIjpbIlJFTlRFUiJdfQ.y', expiresIn: 3600 })));
    useCartStore.setState({ items: [{ vehicleId: 'v1' }] });
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByText('register'));
    await user.click(screen.getByText('verify'));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/booking/checkout'));
    expect(useAuthStore.getState().token).toBeTruthy();
    useCartStore.setState({ items: [] });
  });

  it('falls back to the login page when it has no password to use (e.g. after a reload)', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByText('verify'));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/auth/login'));
    expect(logins).toEqual([]);
  });
});
