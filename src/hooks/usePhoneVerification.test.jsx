// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import PhoneVerification from '../components/profile/PhoneVerification';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;
const confirm = vi.fn();
const signIn = vi.fn();

vi.mock('firebase/app', () => ({ initializeApp: () => ({}), getApps: () => [] }));
vi.mock('firebase/auth', () => ({
  getAuth: () => ({}),
  RecaptchaVerifier: class { clear() {} },
  signInWithPhoneNumber: (...a) => signIn(...a),
  signOut: () => Promise.resolve(),
}));

function renderIt(props) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PhoneVerification phoneNumber="+254712345678" {...props} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.stubEnv('VITE_ENABLE_PHONE_VERIFICATION', 'true');
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'k');
  vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'x.firebaseapp.com');
  vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'x');
  vi.stubEnv('VITE_FIREBASE_APP_ID', '1:2:web:3');
  signIn.mockReset().mockResolvedValue({ confirm });
  confirm.mockReset().mockResolvedValue({ user: { getIdToken: () => Promise.resolve('firebase-id-token') } });
});
afterEach(() => vi.unstubAllEnvs());

describe('PhoneVerification (Firebase SMS)', () => {
  it('sends a code to the phone, then hands the Firebase token to the backend', async () => {
    const user = userEvent.setup();
    let body;
    server.use(http.post(`${BASE}/auth/verify-firebase-phone`, async ({ request }) => { body = await request.json(); return HttpResponse.json({}); }));
    renderIt();

    await user.click(screen.getByRole('button', { name: /verify by sms/i }));
    expect(signIn).toHaveBeenCalledWith(expect.anything(), '+254712345678', expect.anything());
    await user.type(await screen.findByLabelText(/code/i), '123456');
    await user.click(screen.getByRole('button', { name: /^verify$/i }));

    expect(await screen.findByText(/phone number verified/i)).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledWith('123456');
    expect(body).toEqual({ firebaseIdToken: 'firebase-id-token' });
  });

  it('explains a wrong code', async () => {
    const user = userEvent.setup();
    confirm.mockRejectedValue({ code: 'auth/invalid-verification-code' });
    renderIt();

    await user.click(screen.getByRole('button', { name: /verify by sms/i }));
    await user.type(await screen.findByLabelText(/code/i), '000000');
    await user.click(screen.getByRole('button', { name: /^verify$/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/code isn't right/i));
  });

  it('is off unless switched on, even with Firebase set up', () => {
    vi.stubEnv('VITE_ENABLE_PHONE_VERIFICATION', '');
    renderIt();
    expect(screen.queryByRole('button', { name: /verify by sms/i })).not.toBeInTheDocument();
  });

  it('shows Verified when the backend already says so, and nothing when Firebase is not set up', () => {
    const { unmount } = renderIt({ verified: true });
    expect(screen.getByText(/phone number verified/i)).toBeInTheDocument();
    unmount();
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');
    renderIt();
    expect(screen.queryByRole('button', { name: /verify by sms/i })).not.toBeInTheDocument();
  });
});
