// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import toast from 'react-hot-toast';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import Verify2faPage from './Verify2faPage';

const BASE = 'http://192.168.8.11:8080/api/v1';

const jwt = (claims) => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS384' })}.${b64(claims)}.sig`;
};
const tokenFor = (roles) => jwt({ userId: 'u1', email: 'ann@gmail.com', roles, enabled: true, permissions: [] });

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderAt(path) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/verify-2fa" element={<Verify2faPage />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

/** A stand-in for Google's library: remembers how the button was set up, so a test can "pick an account". */
function fakeGoogle() {
  const google = { initialize: vi.fn(), renderButton: vi.fn((el) => { el.textContent = 'Continue with Google'; }) };
  window.google = { accounts: { id: google } };
  return { google, pick: (credential) => google.initialize.mock.calls.at(-1)[0].callback({ credential }) };
}

beforeEach(() => vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'abc.apps.googleusercontent.com'));

afterEach(() => {
  vi.unstubAllEnvs();
  delete window.google;
  act(() => useAuthStore.setState({ token: null, user: null, mode: null }));
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('Sign in with Google', () => {
  it('is hidden until a Google client ID is set', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    fakeGoogle();
    renderAt('/auth/login');
    expect(screen.queryByTestId('google-signin')).not.toBeInTheDocument();
  });

  it('shows Google’s button on the log-in page and on the register page', async () => {
    const { google } = fakeGoogle();
    const { unmount } = renderAt('/auth/login');
    await waitFor(() => expect(google.renderButton).toHaveBeenCalled());
    expect(google.initialize.mock.calls[0][0].client_id).toBe('abc.apps.googleusercontent.com');
    expect(google.renderButton.mock.calls[0][1].text).toBe('signin_with');
    unmount();

    google.renderButton.mockClear();
    renderAt('/auth/register');
    await waitFor(() => expect(google.renderButton).toHaveBeenCalled());
    expect(google.renderButton.mock.calls[0][1].text).toBe('signup_with');
    expect(screen.getByText('or sign up with your email')).toBeInTheDocument();
  });

  it('sends Google’s token to POST /auth/google, marked as a sign-up, and signs the person in', async () => {
    const { google, pick } = fakeGoogle();
    let body;
    server.use(
      http.post(`${BASE}/auth/google`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ tokenType: 'Bearer', accessToken: tokenFor(['RENTER']), expiresIn: 3600000 });
      })
    );
    renderAt('/auth/register');
    await waitFor(() => expect(google.initialize).toHaveBeenCalled());
    act(() => pick('google-id-token'));

    // The Register page's button asks the backend not to silently sign someone into an existing account —
    // see the next test and docs/backend-requests.md item 7.
    await waitFor(() => expect(body).toEqual({ idToken: 'google-id-token', intent: 'register' }));
    await waitFor(() => expect(useAuthStore.getState().token).toBeTruthy());
    expect(useAuthStore.getState().user.email).toBe('ann@gmail.com');
    await waitFor(() => expect(screen.getByTestId('where')).toBeInTheDocument());
  });

  it('marks the log-in page’s button as a sign-in, not a sign-up', async () => {
    const { google, pick } = fakeGoogle();
    let body;
    server.use(
      http.post(`${BASE}/auth/google`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ tokenType: 'Bearer', accessToken: tokenFor(['RENTER']), expiresIn: 3600000 });
      })
    );
    renderAt('/auth/login');
    await waitFor(() => expect(google.initialize).toHaveBeenCalled());
    act(() => pick('google-id-token'));

    await waitFor(() => expect(body).toEqual({ idToken: 'google-id-token', intent: 'login' }));
  });

  it('refuses to sign up with Google for an email that already has an account, and says so', async () => {
    const { google, pick } = fakeGoogle();
    const error = vi.spyOn(toast, 'error').mockImplementation(() => {});
    server.use(
      http.post(`${BASE}/auth/google`, () =>
        HttpResponse.json({ message: 'This email already has an account. Please log in instead.' }, { status: 409 })
      )
    );
    renderAt('/auth/register');
    await waitFor(() => expect(google.initialize).toHaveBeenCalled());
    act(() => pick('google-id-token'));

    await waitFor(() => expect(error).toHaveBeenCalledWith('This email already has an account. Please log in instead.'));
    expect(useAuthStore.getState().token).toBeNull();
    error.mockRestore();
  });

  it('carries on to two-factor verification when the account has it switched on', async () => {
    const { google, pick } = fakeGoogle();
    server.use(http.post(`${BASE}/auth/google`, () => HttpResponse.json({ twoFactorRequired: true, email: 'ann@gmail.com' })));
    renderAt('/auth/login');
    await waitFor(() => expect(google.initialize).toHaveBeenCalled());
    act(() => pick('google-id-token'));
    expect(await screen.findByRole('heading', { name: /verif|two-factor|code/i })).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('says Google could not verify the sign-in, and stays on the page, when the backend refuses the token', async () => {
    const { google, pick } = fakeGoogle();
    const error = vi.spyOn(toast, 'error').mockImplementation(() => {});
    server.use(http.post(`${BASE}/auth/google`, () => HttpResponse.json({ status: 401, error: 'Unauthorized', message: 'Google token verification failed', fieldErrors: {} }, { status: 401 })));
    renderAt('/auth/login');
    await waitFor(() => expect(google.initialize).toHaveBeenCalled());
    act(() => pick('bad-token'));
    await waitFor(() => expect(error).toHaveBeenCalledWith(expect.stringMatching(/google couldn.t verify that sign-in/i)));
    expect(useAuthStore.getState().token).toBeNull();
    error.mockRestore();
  });

  it('shows the backend’s own reason for any other failure', async () => {
    const { google, pick } = fakeGoogle();
    const error = vi.spyOn(toast, 'error').mockImplementation(() => {});
    server.use(http.post(`${BASE}/auth/google`, () => HttpResponse.json({ message: 'This account is disabled' }, { status: 403 })));
    renderAt('/auth/login');
    await waitFor(() => expect(google.initialize).toHaveBeenCalled());
    act(() => pick('t'));
    await waitFor(() => expect(error).toHaveBeenCalledWith('This account is disabled'));
    error.mockRestore();
  });

  it('hides the button, and leaves email sign-in alone, when Google’s script cannot load', async () => {
    // No window.google and the script never loads in jsdom: make it fail straight away.
    const append = vi.spyOn(document.head, 'appendChild').mockImplementation((script) => {
      queueMicrotask(() => script.onerror?.());
      return script;
    });
    renderAt('/auth/login');
    await waitFor(() => expect(screen.queryByTestId('google-signin')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /^log in$/i })).toBeInTheDocument();
    append.mockRestore();
  });
});
