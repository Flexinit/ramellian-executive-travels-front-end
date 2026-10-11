// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import LoginPage from './LoginPage';
import Verify2faPage from './Verify2faPage';

const BASE = 'http://192.168.8.11:8080/api/v1';

const jwt = (claims) => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS384' })}.${b64(claims)}.sig`;
};
const tokenFor = (roles) => jwt({ userId: 'u1', email: 'ann@example.com', roles, enabled: true, permissions: [] });

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderLogin(initial = '/auth/login', state) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={[{ pathname: initial, state }]}>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/verify-2fa" element={<Verify2faPage />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

async function fillAndSubmit(user) {
  await user.type(screen.getByLabelText('Email'), 'ann@example.com');
  await user.type(screen.getByLabelText('Password'), 'secret123');
  await user.click(screen.getByRole('button', { name: /^log in$/i }));
}

const loginWith = (roles) => server.use(http.post(`${BASE}/auth/login`, () => HttpResponse.json({ accessToken: tokenFor(roles) })));

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null, mode: null }));
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('LoginPage — one form for everyone; the account decides where you land', () => {
  it('has no logo of its own — the top bar already shows it', () => {
    renderLogin();
    expect(screen.queryByText('RAMELLIAN')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /ramellian/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('sits on a photo backdrop, with the form still readable and usable', () => {
    renderLogin();
    const backdrop = screen.getByTestId('auth-backdrop');
    expect(backdrop.querySelector('img')).toHaveAttribute('src');
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^log in$/i })).toBeInTheDocument();
  });

  it('asks only for an email and a password — there is no "log in as" choice', () => {
    renderLogin();
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.queryByText(/log in as/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('a renter opens the renter dashboard, in renter mode', async () => {
    const user = userEvent.setup();
    loginWith(['RENTER']);
    renderLogin();
    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard'));
    expect(useAuthStore.getState().mode).toBe('renter');
  });

  it('a plain account with no roles at all (how the backend sends a renter) opens the renter dashboard', async () => {
    const user = userEvent.setup();
    loginWith([]);
    renderLogin();
    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard'));
  });

  it('a car owner opens the Owner Panel, in owner mode', async () => {
    const user = userEvent.setup();
    loginWith(['CAR_OWNER']);
    renderLogin();
    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/owner'));
    expect(useAuthStore.getState().mode).toBe('owner');
  });

  it('an owner who also rents opens on the side they used last', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('ramellian.side.u1', 'renter');
    loginWith(['OWNER', 'RENTER']);
    renderLogin();
    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/dashboard'));
    expect(useAuthStore.getState().mode).toBe('renter');
  });

  it('an owner who has never chosen a side opens the Owner Panel', async () => {
    const user = userEvent.setup();
    loginWith(['OWNER', 'RENTER']);
    renderLogin();
    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/owner'));
  });

  it('someone who came in through "List Your Car" opens the Owner Panel setup, even as a plain renter — once', async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem('ramellian.intent', 'owner');
    loginWith([]);
    renderLogin();
    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/owner'));
    expect(useAuthStore.getState().mode).toBe('owner');
    expect(window.sessionStorage.getItem('ramellian.intent')).toBeNull();
  });

  it('an administrator still opens the admin panel whatever they came in through', async () => {
    const user = userEvent.setup();
    window.sessionStorage.setItem('ramellian.intent', 'owner');
    loginWith(['SUPER_ADMIN']);
    renderLogin();
    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/admin'));
  });

  it('remembers the side an owner switches to, for their next login', () => {
    act(() => {
      useAuthStore.getState().setToken(tokenFor(['OWNER', 'RENTER']));
      useAuthStore.getState().setMode('renter');
    });
    expect(window.localStorage.getItem('ramellian.side.u1')).toBe('renter');
  });

  it('a super admin opens the admin panel, with no side chosen', async () => {
    const user = userEvent.setup();
    loginWith(['SUPER_ADMIN', 'MANAGE', 'CAR_OWNER']);
    renderLogin();
    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/admin'));
    expect(useAuthStore.getState().user.roles).toEqual(['ADMIN', 'MANAGER', 'OWNER']);
    expect(useAuthStore.getState().mode).toBeNull();
  });

  it('an administrator opens the admin panel too', async () => {
    const user = userEvent.setup();
    loginWith(['ADMIN']);
    renderLogin();
    await fillAndSubmit(user);

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/admin'));
  });

  it('sends the backend only the email and password', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/auth/login`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ accessToken: tokenFor(['RENTER']) });
      })
    );
    renderLogin();
    await fillAndSubmit(user);

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toEqual({ email: 'ann@example.com', password: 'secret123' });
  });

  it('lands by roles after two-factor login too', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${BASE}/auth/login`, () => HttpResponse.json({ twoFactorRequired: true, email: 'ann@example.com' })),
      http.post(`${BASE}/auth/verify-2fa`, async ({ request }) => {
        const sent = await request.json();
        expect(sent).toEqual({ email: 'ann@example.com', code: '123456' });
        return HttpResponse.json({ accessToken: tokenFor(['OWNER']) });
      })
    );
    renderLogin();
    await fillAndSubmit(user);

    await screen.findByRole('heading', { name: /verif|code|two/i });
    const boxes = screen.getAllByRole('textbox');
    for (let i = 0; i < 6; i += 1) await user.type(boxes[i], String(i + 1));
    await user.click(screen.getByRole('button', { name: /verify|confirm|continue/i }));

    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/owner'));
    expect(useAuthStore.getState().mode).toBe('owner');
  });

  it('still shows "Incorrect email or password" for a wrong password, and sets no mode', async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/auth/login`, () => new HttpResponse(null, { status: 401 })));
    renderLogin();
    await fillAndSubmit(user);
    expect(await screen.findByText(/incorrect email or password/i)).toBeInTheDocument();
    expect(useAuthStore.getState().mode).toBeNull();
  });
});
