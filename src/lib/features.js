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
