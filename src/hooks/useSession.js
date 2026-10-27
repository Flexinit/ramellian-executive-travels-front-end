import { useCallback, useEffect, useRef, useState } from 'react';
import { refreshSession, useAuthStore } from '../store/authStore';
import { decodeJwt } from '../lib/jwt';

/** How long before the access token expires it's renewed. */
const REFRESH_LEAD_MS = 60_000;
/** setTimeout's ceiling (about 24.8 days): a longer wait fires at once. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Keeps a signed-in person signed in while they use the portal (product owner, 2026-10-27): renews the access token
 * just before it expires (`refreshSession` → `POST /auth/refresh`), at its `exp` less a minute. A computer that slept
 * through that moment renews as soon as the tab is looked at again; a request that still meets an expired token is
 * renewed and retried by the API client (lib/api.js). Mount once near the app root.
 */
export function useTokenRefresh() {
  const token = useAuthStore((s) => s.token);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const expired = useAuthStore((s) => s.sessionExpired);

  useEffect(() => {
    if (!token || !refreshToken || expired) return undefined;
    const exp = decodeJwt(token)?.exp;
    if (!exp) return undefined;
    const expiresAt = exp * 1000;
    const due = () => expiresAt - Date.now() <= REFRESH_LEAD_MS;
    // Failures are left to the API client: offline it tries again on the next request; refused, it asks to log in.
    const renew = () => refreshSession().catch(() => {});

    const timer = setTimeout(renew, Math.min(MAX_TIMEOUT_MS, Math.max(0, expiresAt - REFRESH_LEAD_MS - Date.now())));
    function onVisible() {
      if (document.visibilityState === 'visible' && due()) renew();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, refreshToken, expired]);
}

/** No activity for this long (in any tab of the portal) starts the sign-out countdown. */
export const IDLE_TIMEOUT_MS = 30 * 60_000;
/** The countdown before an idle person is signed out. */
export const IDLE_WARNING_SECONDS = 60;

const ACTIVITY_KEY = 'auth:lastActive';
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'scroll', 'touchstart'];

function sharedLastActive() {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Notices when a signed-in person has stopped using the portal: after `idleMs` with no activity in any of its tabs
 * (kept in localStorage, so reading in one tab keeps the others alive), `warningSince` is set — the moment the 60-second
 * countdown began (IdleSignOutModal). Activity is no longer counted once it shows: only **Stay signed in** (`stay`),
 * or activity in another tab, ends it.
 *
 * @param {{ idleMs?: number }} [options]
 * @returns {{ warningSince: number|null, stay: () => void }}
 */
export function useIdleWarning({ idleMs = IDLE_TIMEOUT_MS } = {}) {
  const signedIn = useAuthStore((s) => !!s.token && !s.sessionExpired);
  const [warningSince, setWarningSince] = useState(null);
  const lastActive = useRef(Date.now());
  const lastShared = useRef(0);
  const warning = useRef(null);
  warning.current = warningSince;

  const markActive = useCallback(() => {
    const now = Date.now();
    lastActive.current = now;
    if (now - lastShared.current > 5_000) {
      lastShared.current = now;
      try {
        localStorage.setItem(ACTIVITY_KEY, String(now));
      } catch {
        // this tab still counts its own activity
      }
    }
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setWarningSince(null);
      return undefined;
    }
    lastShared.current = 0;
    markActive();

    function onActivity() {
      if (!warning.current) markActive();
    }
    function check() {
      const latest = Math.max(lastActive.current, sharedLastActive());
      if (warning.current) {
        if (latest > warning.current) setWarningSince(null); // used in another tab meanwhile
      } else if (Date.now() - latest >= idleMs) {
        setWarningSince(Date.now());
      }
    }
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const interval = setInterval(check, 1_000);
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearInterval(interval);
    };
  }, [signedIn, idleMs, markActive]);

  const stay = useCallback(() => {
    lastShared.current = 0;
    markActive();
    setWarningSince(null);
  }, [markActive]);

  return { warningSince, stay };
}
