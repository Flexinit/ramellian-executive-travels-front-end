import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiGet, apiPatch, apiPost } from '../lib/api';
import { useAuthStore, getRememberMe } from '../store/authStore';
import { markCodeSent } from '../lib/codeTimer';
import { getLastSide, homeFor, sideAtLogin, takeOwnerIntent } from '../lib/landing';
import { useCartStore } from '../store/cartStore';

/**
 * Authentication mutations — talk directly to the real backend per
 * FRONTEND_INTEGRATION.md §1 and confirmed against the live OpenAPI spec
 * (`/v3/api-docs`). `POST /auth/login`'s `AuthResponse` is just
 * `{ tokenType, accessToken, expiresIn }` — no `user` object — so `user` is
 * populated from the access token's own claims (see authStore.js's
 * `setToken`) plus `GET /users/me` shortly after (synced in App.jsx's
 * RootLayout via `useCurrentUser`), not from this response.
 */

export { homeFor };

/**
 * Finishes a login: stores the token, then lands the person by their roles (see lib/landing.js) —
 * there is no "log in as" choice; an owner who also rents opens on the side they used last. The exception:
 * someone with vehicles waiting in their booking (they signed up or logged in from checkout) goes back to
 * checkout to carry on with it — whatever other roles the account also holds, since an admin/owner testing
 * or completing their own booking wants the same thing anyone else does.
 */
function completeLogin(accessToken, setToken, setMode, navigate) {
  setToken(accessToken);
  const { id, roles = [] } = useAuthStore.getState().user || {};
  const side = sideAtLogin(roles, getLastSide(id), takeOwnerIntent());
  setMode(side);
  toast.success('Welcome back.');
  const hasSelection = useCartStore.getState().items.length > 0;
  navigate(hasSelection ? '/booking/checkout' : homeFor(side, roles));
}

/**
 * Logs in with email + password. If the account has 2FA enabled, the
 * backend is expected to signal that instead of returning a token
 * (FRONTEND_INTEGRATION.md §1: "complete verify-2fa before treating login
 * as complete") — assumed here as a `twoFactorRequired` flag.
 */
/**
 * @param {{ stayOnPage?: boolean }} [options] — `stayOnPage`: logging in again after the session ended
 *   (ReauthModal) — keep the person exactly where they were instead of landing them on their home page.
 */
export function useLogin({ stayOnPage = false } = {}) {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const setMode = useAuthStore((s) => s.setMode);

  return useMutation({
    // `rememberMe` (LoginRequest, local backend 2026-10-16) is always sent: that backend answers 400 "The request
    // format or parameter values are invalid" when it's missing, although its spec marks it optional.
    mutationFn: (credentials) => apiPost('/auth/login', { ...credentials, rememberMe: getRememberMe() }),
    onSuccess: (data) => {
      if (data?.twoFactorRequired) {
        navigate('/auth/verify-2fa', { state: { email: data.email } });
        return;
      }
      if (stayOnPage) {
        setToken(data.accessToken);
        toast.success("You're signed in again.");
        return;
      }
      completeLogin(data.accessToken, setToken, setMode, navigate);
    },
    onError: (error) => {
      const status = error?.response?.status;
      // 401 and 422 are surfaced on the form itself by the caller.
      if (status !== 401 && status !== 422) {
        toast.error(error?.response?.data?.message || 'Something went wrong. Please try again.');
      }
    },
  });
}

/**
 * Signs in — or signs up, the first time — with a Google account: `POST /auth/google` `{ idToken, role? }`, where `idToken` is the
 * signed ID token Google gave the browser (the backend checks it with Google: `401 "Google token verification failed"` if it can't).
 * The answer is the same `AuthResponse` as `POST /auth/login`, so it finishes the same way. `role` is optional and isn't sent: the
 * owner side is chosen the usual way, through the owner profile (see `takeOwnerIntent` in lib/landing.js).
 *
 * @param {'login'|'register'} [intent] — which button this is. The Login page's "Sign in with Google" (the
 *   default) is unchanged: it signs in, or creates the account the first time. The Register page's "Sign up
 *   with Google" passes `'register'`, asking the backend to *refuse* rather than silently sign someone into
 *   an account that already exists under that email — `docs/backend-requests.md` item 7, not yet built, so
 *   sending `intent` is forward-compatible today rather than something the backend currently acts on: until
 *   it does, "Sign up with Google" for an existing email still just logs that person in, same as before.
 */
export function useGoogleLogin(intent = 'login', { stayOnPage = false } = {}) {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const setMode = useAuthStore((s) => s.setMode);

  return useMutation({
    mutationFn: (idToken) => apiPost('/auth/google', { idToken, intent }),
    onSuccess: (data) => {
      if (data?.twoFactorRequired) {
        navigate('/auth/verify-2fa', { state: { email: data.email } });
        return;
      }
      // Logging in again after the session ended (ReauthModal): stay exactly where they were.
      if (stayOnPage) {
        setToken(data.accessToken);
        toast.success("You're signed in again.");
        return;
      }
      completeLogin(data.accessToken, setToken, setMode, navigate);
    },
    onError: (error) => {
      const status = error?.response?.status;
      // The conflict the backend is asked to report for a 'register' attempt on an email that already
      // exists (item 7) — once it does, this is the one status this hook treats specially.
      if (intent === 'register' && status === 409) {
        toast.error(error?.response?.data?.message || 'This email already has an account. Please log in instead.');
        return;
      }
      toast.error(
        status === 401
          ? "Google couldn't verify that sign-in. Please try again."
          : error?.response?.data?.message || "We couldn't sign you in with Google. Please try again."
      );
    },
  });
}

/**
 * The email and password someone just registered with, held **in memory only** (never stored, gone on a
 * reload) so that, once they enter their verification code, they're signed in straight away instead of being
 * sent to log in with the password they typed moments ago. `POST /auth/verify-email` returns no token, so
 * this is the only way to skip that step. Cleared as soon as it's used. The phone number from the sign-up
 * form rides along too and is saved to the profile right after signing in, so checkout doesn't ask for it.
 */
let justRegistered = null;

/**
 * After a successful verification: signs in with the just-registered credentials when they're for this
 * email (landing like any login — back on checkout if a booking is waiting), else sends them to log in.
 */
async function finishVerification(email, label, setToken, setMode, navigate) {
  const pending = justRegistered;
  justRegistered = null;
  if (pending && email && pending.email.toLowerCase() === email.toLowerCase()) {
    try {
      const data = await apiPost('/auth/login', { email: pending.email, password: pending.password, rememberMe: getRememberMe() });
      if (data?.accessToken && !data.twoFactorRequired) {
        if (pending.phoneNumber) {
          setToken(data.accessToken);
          // Best effort: if it doesn't save, checkout's own "Add your phone number" box still asks.
          await apiPatch('/users/me', { phoneNumber: pending.phoneNumber }).catch(() => {});
        }
        toast.success(`${label} verified — you're signed in.`);
        completeLogin(data.accessToken, setToken, setMode, navigate);
        return;
      }
    } catch {
      // fall through to the login page
    }
  }
  toast.success(`${label} verified — you can now log in.`);
  navigate('/auth/login');
}

/** The `verificationChannel` that asks for the registration code on WhatsApp instead of by email. */
export const WHATSAPP_CHANNEL = 'WHATSAPP';

/**
 * Registers a new account — the same public sign-up form for every role;
 * every new account starts as RENTER. Confirmed live against the real
 * backend: `PUT /users/me/owner-profile` (submitted from the Owner
 * onboarding step on `/owner`) self-service grants the OWNER role — a
 * RENTER-only account calling it comes back with `roles: ["OWNER",
 * "RENTER"]`, no admin involved. ADMIN/MANAGER assignment is not
 * self-service and isn't exposed anywhere in this frontend; that still
 * needs to happen through backend/database access.
 */
export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    // `profilePhone` isn't part of `RegisterRequest` — it's kept for the profile (see `justRegistered`).
    mutationFn: ({ profilePhone, ...payload }) => apiPost('/auth/register', payload),
    onSuccess: (_data, variables) => {
      justRegistered = {
        email: variables.email,
        password: variables.password,
        phoneNumber: (variables.profilePhone || variables.phoneNumber || '').trim(),
      };
      // A verification code has just been sent — start the verify page's one-minute countdown from now.
      const whatsapp = variables.verificationChannel === WHATSAPP_CHANNEL;
      markCodeSent(variables.email);
      toast.success(whatsapp ? 'Account created — check WhatsApp for your code.' : 'Account created — check your email to verify it.');
      navigate('/auth/verify-email', {
        state: { email: variables.email, channel: whatsapp ? 'WHATSAPP' : 'EMAIL', phoneNumber: variables.phoneNumber },
      });
    },
    onError: (error) => {
      if (error?.response?.status !== 422) {
        toast.error(error?.response?.data?.message || 'Could not create your account. Please try again.');
      }
    },
  });
}

/**
 * Verifies an email address using the code sent by email.
 * Confirmed live against the real backend: `POST /auth/verify-email` takes
 * `{ email, code }`, not `{ token }` — it rejects a bare token payload with
 * a 400 ("email must not be blank", "code must not be blank"). The emailed
 * message contains a short numeric code, not a clickable verification link. Someone who registered in this
 * page load is then signed in automatically (see `justRegistered`).
 */
export function useVerifyEmail() {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const setMode = useAuthStore((s) => s.setMode);

  return useMutation({
    mutationFn: ({ email, code }) => apiPost('/auth/verify-email', { email, code }),
    onSuccess: (_data, { email }) => finishVerification(email, 'Email', setToken, setMode, navigate),
  });
}

/**
 * Verifies an account with the 6-digit code sent to its WhatsApp number:
 * `POST /auth/verify-whatsapp` takes `{ email, code }` (or `{ phoneNumber, code }` — but the backend
 * matches a phone number exactly as it was stored, with no normalising, so the email is always used
 * when it's known). Wrong or stale codes come back as 400 "Invalid or expired verification code". Signs in
 * automatically after, like `useVerifyEmail`.
 */
export function useVerifyWhatsApp() {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const setMode = useAuthStore((s) => s.setMode);

  return useMutation({
    mutationFn: ({ email, code }) => apiPost('/auth/verify-whatsapp', { email, code }),
    onSuccess: (_data, { email }) => finishVerification(email, 'WhatsApp', setToken, setMode, navigate),
  });
}

/**
 * Sends a verification code to the account's WhatsApp number (`POST /auth/send-whatsapp-code`,
 * `{ email }`). The account must have a phone number: an unknown account is a 404 "User not found".
 */
export function useSendWhatsAppCode() {
  return useMutation({
    mutationFn: ({ email }) => apiPost('/auth/send-whatsapp-code', { email }),
    onSuccess: (_data, { email }) => {
      markCodeSent(email);
      toast.success('A code is on its way — check WhatsApp.');
    },
  });
}

/** Completes login for accounts with two-factor authentication enabled. */
export function useVerify2fa() {
  const navigate = useNavigate();
  const setToken = useAuthStore((s) => s.setToken);
  const setMode = useAuthStore((s) => s.setMode);

  return useMutation({
    mutationFn: (payload) => apiPost('/auth/verify-2fa', payload),
    onSuccess: (data) => completeLogin(data.accessToken, setToken, setMode, navigate),
  });
}

/**
 * Guarantees that someone who just signed in with vehicles still waiting in their booking is sent to
 * checkout — from the app root, the moment `isAuthenticated` itself flips to true, rather than trusting
 * each individual sign-in path (login, Google, 2FA) to navigate there itself. `completeLogin` already tries
 * to do that at the point of login, but a guest-only route's own redirect for a newly-authenticated visitor
 * (`GuestRoute`, which defaults to `/dashboard`) can end up winning that race depending on exact render
 * timing — this fires independently of whichever route the person happened to sign in from, so it catches
 * every path, present or future. Mount once, in RootLayout, alongside useSessionExpiry.
 */
export function useReturnToCheckoutAfterAuth() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const wasAuthenticated = useRef(isAuthenticated);

  useEffect(() => {
    const justSignedIn = isAuthenticated && !wasAuthenticated.current;
    wasAuthenticated.current = isAuthenticated;
    if (!justSignedIn) return;
    const hasSelection = useCartStore.getState().items.length > 0;
    if (hasSelection) {
      navigate('/booking/checkout', { replace: true });
    }
  }, [isAuthenticated, navigate]);
}

/**
 * Signs the user out and sends them to the main page when the API reports an
 * expired/invalid session (the axios interceptor in lib/api.js dispatches
 * `auth:expired` on any 401). Only acts while someone is actually signed in —
 * a 401 from a wrong password on the login form must not trigger it. Mount
 * once near the app root (App.jsx's RootLayout).
 *
 * A 401 from one endpoint doesn't prove the session is gone: an endpoint can wrongly answer 401 for a role it doesn't
 * allow (an owner opening Statements was logged out by `GET /owner/statements`, 2026-10-26). So unless the refusal
 * came from the session check itself, the session is checked first (`GET /users/me`) and the person is only signed
 * out if that's refused too — otherwise they stay signed in and the page shows its own error.
 */
export function useSessionExpiry() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const checking = useRef(false);

  useEffect(() => {
    function signOut() {
      const { isAuthenticated, clearAuth } = useAuthStore.getState();
      if (!isAuthenticated()) return;
      clearAuth();
      queryClient.clear();
      toast('Your session has expired — please log in again.', { icon: 'ℹ️' });
      navigate('/');
    }

    function handleExpired(event) {
      const state = useAuthStore.getState();
      if (!state.isAuthenticated() || state.sessionExpired) return;
      const detail = event?.detail;
      // The session check itself was refused: it really has ended. The person stays on the page and is asked to log
      // in again over it (ReauthModal) — their page and anything half-done are kept. (No detail: an older caller
      // that means "sign out now".)
      if (!detail) {
        signOut();
        return;
      }
      if (detail.isSessionCheck) {
        state.expireSession();
        return;
      }
      if (checking.current) return;
      checking.current = true;
      // The page that made the request — remembered as not allowed if the session turns out to be fine.
      const page = window.location.pathname;
      apiGet('/users/me')
        // Still signed in: it was this page's data that was refused, not the session. Say so on the page and drop it
        // from the menu. (If /users/me is refused too, the interceptor reports a session check: the branch above.)
        .then(() => useAuthStore.getState().denyPath(page))
        .catch(() => {})
        .finally(() => {
          checking.current = false;
        });
    }
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [navigate, queryClient]);
}

/**
 * Asks the backend to email a fresh verification code
 * (`POST /auth/resend-verification`, body `{ email }`, answers 200 with no
 * body). Records the send time so the verify page's countdown restarts.
 */
export function useResendVerification() {
  return useMutation({
    mutationFn: ({ email }) => apiPost('/auth/resend-verification', { email }),
    onSuccess: (_data, { email }) => {
      markCodeSent(email);
      toast.success('A new code is on its way — check your email.');
    },
  });
}

/**
 * Step 1 of resetting a forgotten password (`POST /auth/forgot-password`, body `{ email }`): the backend emails a
 * 6-digit code. It answers the same whether or not the email has an account, so the page never says which.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: ({ email }) => apiPost('/auth/forgot-password', { email }),
  });
}

/**
 * Step 2 (`POST /auth/reset-password`, body `{ email, code, newPassword }` — code exactly 6 characters, new password
 * 8–72): sets the new password. The person then logs in with it.
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ email, code, newPassword }) => apiPost('/auth/reset-password', { email, code, newPassword }),
  });
}
