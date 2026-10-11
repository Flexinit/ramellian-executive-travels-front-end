import axios from 'axios';

/**
 * Lazily import the auth store to avoid a circular dependency at module load time.
 * The store is always initialised before any request is made.
 */
let _getToken = null;

export function _setTokenGetter(fn) {
  _getToken = fn;
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

api.interceptors.request.use(
  (config) => {
    const token = _getToken ? _getToken() : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: normalise errors ──────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // GET /users/me carries no role restriction — every authenticated account, whatever its roles, can
    // call it. So a 403 there can't be a legitimate permission denial; it means the token itself is being
    // refused (some backends answer 403 rather than 401 for a missing/expired/invalid token). Elsewhere in
    // the app a 403 is left alone, since it may just mean "wrong role for this action", not "signed out".
    const isSessionCheck = (error.config?.url ?? '').includes('/users/me') && (error.config?.method ?? 'get').toLowerCase() === 'get';

    if (status === 401 || (status === 403 && isSessionCheck)) {
      // Signal to the app that auth has expired.
      // The actual redirect is handled in the useAuth hook / PrivateRoute.
      window.dispatchEvent(new CustomEvent('auth:expired'));
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
