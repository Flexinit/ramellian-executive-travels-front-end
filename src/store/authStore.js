import { create } from 'zustand';
import { _setRefresher, _setTokenGetter, api } from '../lib/api';
import { decodeJwt } from '../lib/jwt';
import { normalizeRoles } from '../lib/constants';
import { rememberSide } from '../lib/landing';

/** sessionStorage key the access token is mirrored under — see the note below `persistedToken`. */
const TOKEN_STORAGE_KEY = 'auth:token';
/** Where the refresh token (`AuthResponse.refreshToken`, live spec 2026-10-27) is kept — beside the access token. */
const REFRESH_STORAGE_KEY = 'auth:refresh';

/** The `User` shape `setToken` seeds from a token's own claims, pulled out so the module-load
 * rehydration below (`persistedToken`) builds the exact same shape from a stored token. */
function userFromToken(token) {
  const claims = decodeJwt(token);
  return claims
    ? {
        id: claims.userId,
        email: claims.email,
        roles: normalizeRoles(claims.roles),
        // `SUPER_ADMIN` becomes ADMIN in `roles`; this keeps the difference for the few things only a super admin
        // may do (making quotations).
        ...((claims.roles || []).includes('SUPER_ADMIN') ? { isSuperAdmin: true } : {}),
        enabled: claims.enabled,
        permissions: claims.permissions || [],
      }
    : null;
}

/**
 * Restored once, at module load, from sessionStorage — rather than the store always starting signed
 * out on a fresh page load, which is what a true memory-only token would do. This exists specifically
 * because Pesapal's own return redirect (PaymentSuccessPage) is a full browser navigation, which wipes
 * all in-memory state same as closing the tab would; without this, every renter landed back from a real
 * payment in front of `PrivateRoute`'s "please log in" redirect instead of their payment's actual
 * result, no matter how fresh their login was. sessionStorage (cleared on tab close, never shared across
 * tabs) rather than localStorage keeps most of the original memory-only intent — this trades a bit of
 * that XSS mitigation for a payment flow that actually completes.
 */
/**
 * "Remember me" (the log-in and sign-up forms): the token is kept in localStorage instead, so the person stays
 * signed in after closing the browser — until the token itself expires or they log out. Without it, sessionStorage
 * as above. A remembered token that has already expired is dropped on load.
 */
let rememberMe = false;
/** Set by the "Remember me" box before signing in; the next `setToken` stores the token accordingly. */
export function setRememberMe(value) {
  rememberMe = !!value;
}
/** The current "Remember me" choice — also sent with the log-in request (`LoginRequest.rememberMe`). */
export function getRememberMe() {
  return rememberMe;
}

function readLocal() {
  try {
    const t = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!t) return null;
    const exp = decodeJwt(t)?.exp;
    // An expired access token is still worth keeping while there's a refresh token to renew it with.
    if (exp && exp * 1000 <= Date.now() && !localStorage.getItem(REFRESH_STORAGE_KEY)) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
    return t;
  } catch {
    return null;
  }
}

function readStored(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

const sessionToken = readStored(sessionStorage, TOKEN_STORAGE_KEY);
const rememberedToken = sessionToken ? null : readLocal();
const persistedToken = sessionToken || rememberedToken;
const persistedRefresh = sessionToken ? readStored(sessionStorage, REFRESH_STORAGE_KEY) : rememberedToken ? readStored(localStorage, REFRESH_STORAGE_KEY) : null;
if (rememberedToken) rememberMe = true; // a refreshed token stays remembered
if (persistedToken) _setTokenGetter(() => persistedToken);

/**
 * Authentication store. The access token is mirrored into sessionStorage (see `persistedToken` above)
 * so it survives the full-page reload Pesapal's own redirect causes — and into localStorage too only when the
 * person ticked "Remember me" (`setRememberMe`).
 *
 * `user` is assembled from two sources that land at different times:
 *  - Immediately on login/2FA, `setToken` decodes the access token's own
 *    claims (confirmed against a real token: `userId`, `email`, `roles`,
 *    `enabled`, `permissions`) so role-gated routing (RoleRoute) works the
 *    instant the token exists — no network round trip needed.
 *  - Shortly after, `GET /users/me` resolves with the fuller profile
 *    (`firstName`, `lastName`, `ownerType`, business fields, …) and
 *    `setUser` merges that in (see useProfile.js's `useCurrentUser`,
 *    synced in App.jsx's RootLayout).
 *
 * @typedef {{ id: string, email: string, roles: string[], enabled?: boolean, permissions?: string[], firstName?: string, lastName?: string }} User
 */
const useAuthStore = create((set, get) => ({
  /** @type {string|null} */
  token: persistedToken,

  /** Renews the access token before it expires (`POST /auth/refresh`, see `refreshSession`). @type {string|null} */
  refreshToken: persistedRefresh,

  /** @type {User|null} */
  user: persistedToken ? userFromToken(persistedToken) : null,

  /**
   * Which side of the portal the person is using — 'renter' or 'owner' (set at login from their roles and
   * the side they used last, and by the switch in the left menu). It picks their left menu; it changes
   * nothing on the backend. Null for an administrator or a session that hasn't set it, which behaves as
   * "owner if they own, otherwise renter". The last side used is remembered per person on this browser.
   * @type {'renter'|'owner'|null}
   */
  mode: null,

  /** @param {'renter'|'owner'|null} mode */
  setMode: (mode) => {
    set({ mode });
    rememberSide(get().user?.id, mode);
  },

  /** @returns {boolean} */
  isAuthenticated: () => !!get().token,

  /**
   * The session has ended (the backend refused even `GET /users/me`), but the person stays where they are: the app
   * asks them to log in again over the current page (components/auth/ReauthModal.jsx) instead of throwing them out.
   * Cleared by logging in again (`setToken`) or signing out (`clearAuth`).
   * @type {boolean}
   */
  sessionExpired: false,
  expireSession: () => set({ sessionExpired: true }),

  /**
   * Pages the backend refused this person although their session is fine (it answered 401/403 for that page's
   * data while `/users/me` still worked) — shown as "not available to your account" and left out of the menu.
   * Learned as they go; forgotten on sign-out or reload.
   * @type {string[]}
   */
  deniedPaths: [],
  denyPath: (path) => set((state) => (state.deniedPaths.includes(path) ? state : { deniedPaths: [...state.deniedPaths, path] })),

  /**
   * Store the token (and the refresh token that renews it — kept as it was when none is given), wire it into the
   * Axios interceptor, and seed `user` from the token's own claims.
   * @param {string} token
   * @param {string} [refreshToken]
   */
  setToken: (token, refreshToken) => {
    _setTokenGetter(() => token);
    const refresh = refreshToken || get().refreshToken || null;
    // Always in sessionStorage (survives Pesapal's full-page redirect); also in localStorage with "Remember me".
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      if (refresh) sessionStorage.setItem(REFRESH_STORAGE_KEY, refresh);
      if (rememberMe) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        if (refresh) localStorage.setItem(REFRESH_STORAGE_KEY, refresh);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(REFRESH_STORAGE_KEY);
      }
    } catch {
      // storage blocked: the in-memory copy still works
    }
    const claimsUser = userFromToken(token);
    set((state) => ({ token, refreshToken: refresh, sessionExpired: false, user: claimsUser ? { ...state.user, ...claimsUser } : state.user }));
  },

  /**
   * Merge additional fields into the authenticated user (e.g. the richer
   * profile from `GET /users/me`), rather than replacing it — `setToken`
   * may have already seeded `id`/`email`/`roles` from the JWT.
   * @param {Partial<User>} user
   */
  setUser: (user) =>
    set((state) => ({
      user: {
        ...state.user,
        ...user,
        ...(user?.roles
          ? {
              roles: normalizeRoles(user.roles),
              ...(user.roles.includes('SUPER_ADMIN') || state.user?.isSuperAdmin ? { isSuperAdmin: true } : {}),
            }
          : {}),
      },
    })),

  /**
   * Clear all auth state and remove the token from the Axios interceptor. The refresh token is revoked on the backend
   * too (`POST /auth/logout`, best effort — signing out never waits on it or fails because of it).
   */
  clearAuth: () => {
    const { refreshToken } = get();
    if (refreshToken) api.post('/auth/logout', { refreshToken }).catch(() => {});
    _setTokenGetter(null);
    try {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(REFRESH_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_STORAGE_KEY);
    } catch {
      // nothing to remove
    }
    rememberMe = false;
    set({ token: null, refreshToken: null, user: null, mode: null, sessionExpired: false, deniedPaths: [] });
  },
}));

let refreshing = null;

/**
 * Renews the access token with the refresh token (`POST /auth/refresh` `{ refreshToken }` → `AuthResponse`, live spec
 * 2026-10-27), so someone still using the portal is never signed out by their token running out. Calls made while one
 * is under way share it. Resolves to the new access token, or `null` when there's no refresh token to try (a session
 * from before refresh tokens); rejects when the backend refuses it — the session has really ended.
 * @returns {Promise<string|null>}
 */
export function refreshSession() {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return Promise.resolve(null);
  if (!refreshing) {
    refreshing = api
      .post('/auth/refresh', { refreshToken })
      .then(({ data }) => {
        // Signed out meanwhile: don't sign them back in.
        if (useAuthStore.getState().refreshToken !== refreshToken) return null;
        useAuthStore.getState().setToken(data.accessToken, data.refreshToken || refreshToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

_setRefresher(refreshSession);

export { useAuthStore };
