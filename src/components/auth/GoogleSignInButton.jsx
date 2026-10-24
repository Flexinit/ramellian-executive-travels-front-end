import React, { useEffect, useRef, useState } from 'react';
import { googleClientId, isGoogleSignInEnabled } from '../../lib/features';
import { loadGoogleIdentity } from '../../lib/googleIdentity';

/** Google's four-colour "G". */
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/**
 * Development only, while no Google client ID is set: a dimmed stand-in that shows where the button will sit. It does nothing,
 * and it never appears in a production build.
 */
function GooglePreview({ text }) {
  const label = text === 'signup_with' ? 'Sign up with Google' : text === 'signin_with' ? 'Sign in with Google' : 'Continue with Google';
  return (
    <div className="flex flex-col items-center gap-1.5" data-testid="google-signin-preview">
      <button type="button" disabled className="inline-flex h-10 w-[300px] max-w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border border-black/20 bg-[#131314] px-4 text-sm font-medium text-white opacity-60">
        <GoogleG />
        {label}
      </button>
      <p className="text-center text-[11px] text-muted">Preview only — set VITE_GOOGLE_CLIENT_ID in .env to switch it on.</p>
    </div>
  );
}

/**
 * Google's own "Continue with Google" button. When someone picks a Google account, `onCredential` is called with Google's signed ID
 * token; the caller sends it to the backend. Renders nothing if Google's script can't be loaded.
 *
 * @param {(credential: string) => void} onCredential
 * @param {'signin_with'|'signup_with'|'continue_with'} [text]
 * @param {boolean} [disabled] — dims the button and ignores it while a sign-in is already under way
 */
export default function GoogleSignInButton({ onCredential, text = 'continue_with', disabled = false }) {
  const holder = useRef(null);
  const callback = useRef(onCredential);
  const busy = useRef(disabled);
  const [failed, setFailed] = useState(false);
  const enabled = isGoogleSignInEnabled();

  useEffect(() => {
    callback.current = onCredential;
    busy.current = disabled;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !holder.current) return;
        google.initialize({
          client_id: googleClientId(),
          callback: ({ credential }) => {
            if (credential && !busy.current) callback.current(credential);
          },
        });
        holder.current.innerHTML = '';
        google.renderButton(holder.current, { type: 'standard', theme: 'filled_black', size: 'large', shape: 'pill', text, logo_alignment: 'left', width: 300 });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [text, enabled]);

  if (!enabled) return import.meta.env.DEV ? <GooglePreview text={text} /> : null;
  if (failed) return null;
  return <div ref={holder} data-testid="google-signin" className={`flex justify-center min-h-[44px] ${disabled ? 'pointer-events-none opacity-60' : ''}`} />;
}
