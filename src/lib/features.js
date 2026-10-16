/**
 * Features that are built but switched off. Each one is off unless its environment variable is the
 * string 'true' (set it in `.env` and restart the dev server / rebuild). Read at call time, so tests can
 * flip it with `vi.stubEnv`.
 */

/**
 * Verifying an account with a code sent on WhatsApp (register-form choice, WhatsApp verify page mode, and
 * the "get the code on WhatsApp instead" switch). Hidden for now: only email verification is offered.
 * Turn on with `VITE_ENABLE_WHATSAPP_VERIFICATION=true`.
 */
export const isWhatsAppVerificationEnabled = () => import.meta.env.VITE_ENABLE_WHATSAPP_VERIFICATION === 'true';

/**
 * "Continue with Google" on the log-in and register pages. Off until a Google OAuth client ID is set:
 * `VITE_GOOGLE_CLIENT_ID=<id>.apps.googleusercontent.com`. It also needs the backend's `POST /auth/google` (see hooks/useAuth.js).
 */
export const googleClientId = () => String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
export const isGoogleSignInEnabled = () => googleClientId().length > 0;

/**
 * Verifying a phone number by SMS code with Google Firebase (Profile → phone → Verify by SMS). Switched off for
 * now (product decision 2026-10-16): on only with `VITE_ENABLE_PHONE_VERIFICATION=true` **and** the Firebase web
 * app's config set — `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
 * `VITE_FIREBASE_APP_ID` (Firebase Console → Project settings → Your apps → Web app). It also needs the backend's
 * `POST /auth/verify-firebase-phone` (see hooks/usePhoneVerification.js).
 */
export const firebaseConfig = () => ({
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
  authDomain: String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
});
export const isPhoneVerificationEnabled = () => {
  if (import.meta.env.VITE_ENABLE_PHONE_VERIFICATION !== 'true') return false;
  const c = firebaseConfig();
  return !!(c.apiKey && c.authDomain && c.projectId && c.appId);
};
