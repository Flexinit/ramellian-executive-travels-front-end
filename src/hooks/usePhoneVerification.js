import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiPost } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { firebaseConfig } from '../lib/features';
import { normalizePhone } from '../lib/phone';

/**
 * Verifying a phone number by SMS with Google Firebase Phone Auth — the backend's flow (2026-10-16):
 *  1. Firebase sends a 6-digit code to the number (an invisible reCAPTCHA guards it);
 *  2. the code is confirmed with Firebase, which gives a Firebase ID token for that number;
 *  3. `POST /auth/verify-firebase-phone { firebaseIdToken, email? }` — the backend checks the token with Firebase
 *     and sets the account's `phoneNumber` (from the token) and `phoneVerified: true`. Signed in, the account comes
 *     from the login token; during registration pass `email`.
 * Firebase is loaded only when a code is first sent, and its own sign-in is dropped straight after — the portal
 * keeps using its own login.
 *
 * @param {{ email?: string }} [options]
 */
export function usePhoneVerification({ email } = {}) {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState('idle'); // 'idle' | 'sending' | 'code' | 'verifying' | 'done'
  const [error, setError] = useState('');
  const confirmation = useRef(null);
  const verifier = useRef(null);
  const firebase = useRef(null);

  useEffect(() => () => verifier.current?.clear?.(), []);

  async function loadFirebase() {
    if (firebase.current) return firebase.current;
    const [{ initializeApp, getApps }, authModule] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
    const app = getApps()[0] || initializeApp(firebaseConfig());
    const auth = authModule.getAuth(app);
    firebase.current = { auth, ...authModule };
    return firebase.current;
  }

  /** Sends the code. `recaptchaContainerId` — an empty element on the page for the invisible reCAPTCHA. */
  async function sendCode(phone, recaptchaContainerId) {
    setError('');
    const e164 = normalizePhone(phone);
    if (!e164) {
      setError('Enter a valid phone number first.');
      return false;
    }
    setStage('sending');
    try {
      const fb = await loadFirebase();
      verifier.current?.clear?.();
      verifier.current = new fb.RecaptchaVerifier(fb.auth, recaptchaContainerId, { size: 'invisible' });
      confirmation.current = await fb.signInWithPhoneNumber(fb.auth, e164, verifier.current);
      setStage('code');
      return true;
    } catch (err) {
      setStage('idle');
      setError(firebaseMessage(err));
      return false;
    }
  }

  /** Confirms the 6-digit code, then has the backend mark the phone verified. Resolves true when done. */
  async function confirmCode(code) {
    setError('');
    if (!/^\d{6}$/.test(String(code).trim())) {
      setError('Enter the 6-digit code from the SMS.');
      return false;
    }
    setStage('verifying');
    try {
      const credential = await confirmation.current.confirm(String(code).trim());
      const firebaseIdToken = await credential.user.getIdToken();
      await apiPost('/auth/verify-firebase-phone', { firebaseIdToken, ...(email ? { email } : {}) });
      firebase.current?.signOut?.(firebase.current.auth).catch?.(() => {});
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      setStage('done');
      return true;
    } catch (err) {
      setStage('code');
      setError(err?.code ? firebaseMessage(err) : apiErrorMessage(err, "Your phone number couldn't be verified."));
      return false;
    }
  }

  return { stage, error, sendCode, confirmCode, reset: () => { setStage('idle'); setError(''); } };
}

/** Firebase's error codes, in words people understand. */
function firebaseMessage(err) {
  switch (err?.code) {
    case 'auth/invalid-phone-number':
      return "That phone number isn't valid.";
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'Too many codes asked for. Please wait a while and try again.';
    case 'auth/invalid-verification-code':
      return "That code isn't right. Check the SMS and try again.";
    case 'auth/code-expired':
      return 'That code has expired. Send a new one.';
    case 'auth/captcha-check-failed':
      return 'The security check failed. Please try again.';
    default:
      return 'We could not send or check the code. Please try again.';
  }
}
