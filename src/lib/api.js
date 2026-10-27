import axios from 'axios';

/**
 * Lazily import the auth store to avoid a circular dependency at module load time.
 * The store is always initialised before any request is made.
 */
let _getToken = null;

export function _setTokenGetter(fn) {
  _getToken = fn;
}

/** Renews the session (authStore's `refreshSession`), registered the same way to avoid a circular import. */
let _refresh = null;

export function _setRefresher(fn) {
  _refresh = fn;
}

/**
 * Base Axios instance.
 * All API calls must go through this instance — never call axios or fetch directly.
 */
export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ─── Request interceptor: attach JWT ─────────────────────────────────────────

/**
 * Signing in — and renewing or ending a session, which the refresh token in the body identifies — sends no access
 * token: on the "Please log in again" form, or just as it's being renewed, the stored one is the expired one, and the
 * backend refuses a request carrying it ("Token has expired") before it even looks at the rest.
 */
const SIGN_IN_PATHS = [
  '/auth/login', '/auth/google', '/auth/verify-2fa', '/auth/register', '/auth/forgot-password', '/auth/reset-password',
  '/auth/refresh', '/auth/logout',
];
const isSignInPath = (url) => SIGN_IN_PATHS.some((path) => (url ?? '').startsWith(path));

api.interceptors.request.use(
  (config) => {
    const token = _getToken ? _getToken() : null;
    if (token && !isSignInPath(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: normalise errors ──────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const config = error.config;
    // A refused sign-in (a wrong password) says nothing about the session.
    if (isSignInPath(config?.url)) return Promise.reject(error);
    // GET /users/me carries no role restriction — every authenticated account, whatever its roles, can
    // call it. So a 403 there can't be a legitimate permission denial; it means the token itself is being
    // refused (some backends answer 403 rather than 401 for a missing/expired/invalid token). Elsewhere in
    // the app a 403 is left alone, since it may just mean "wrong role for this action", not "signed out".
    const isSessionCheck = (config?.url ?? '').includes('/users/me') && (config?.method ?? 'get').toLowerCase() === 'get';

    // The token ran out (it's normally renewed before then — useTokenRefresh — but a laptop asleep misses that):
    // renew it and send the request again, once, so the person never notices. Only if renewing is refused has the
    // session really ended — then they're asked to log in again over the page (ReauthModal).
    if ((status === 401 || (status === 403 && isSessionCheck)) && _refresh && config && !config._retried) {
      config._retried = true;
      let renewed = null;
      try {
        renewed = await _refresh();
      } catch (refreshError) {
        // Refused by the backend: the session is over. No answer at all (offline): leave it for next time.
        if (refreshError?.response) {
          window.dispatchEvent(new CustomEvent('auth:expired', { detail: { url: config.url, isSessionCheck: true } }));
        }
        return Promise.reject(error);
      }
      if (renewed) return api(config);
    }

    if (status === 401 || (status === 403 && isSessionCheck)) {
      // Signal to the app that auth may have expired — which request it was, so useSessionExpiry can tell a real
      // expiry (the session check itself refused) from one endpoint wrongly answering 401 for a valid session.
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: { url: error.config?.url, isSessionCheck } }));
    }

    return Promise.reject(error);
  }
);

// ─── Convenience wrappers ─────────────────────────────────────────────────────

/** @param {string} url @param {object} [params] */
export const apiGet = (url, params) => api.get(url, { params }).then((r) => r.data);

/** @param {string} url @param {any} [data] */
export const apiPost = (url, data) => api.post(url, data).then((r) => r.data);

/** @param {string} url @param {any} [data] */
export const apiPut = (url, data) => api.put(url, data).then((r) => r.data);

/** @param {string} url @param {any} [data] */
export const apiPatch = (url, data) => api.patch(url, data).then((r) => r.data);

/** @param {string} url */
export const apiDelete = (url) => api.delete(url).then((r) => r.data);

/**
 * Upload a file with multipart/form-data.
 * @param {string} url
 * @param {FormData} formData
 * @param {function} [onProgress]
 * @param {'post'|'put'} [method] — most uploads create something new (POST); pass 'put' for an endpoint
 *   that replaces/attaches onto something that already exists (e.g. submitting a contract's signature).
 */
export const apiUpload = (url, formData, onProgress, method = 'post') =>
  api
    .request({
      method,
      url,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total ?? 1)))
        : undefined,
    })
    .then((r) => r.data);
