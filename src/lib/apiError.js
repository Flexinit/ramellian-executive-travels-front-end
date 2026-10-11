/**
 * Turns a failed request into a message that says what actually went wrong,
 * rather than a bare "could not save" — the backend's own message when it
 * sends one (including per-field validation errors), otherwise the HTTP
 * status, or a network/timeout note when there was no response at all.
 *
 * The real backend replies with `{ status, error, message, fieldErrors:
 * { field: "msg" } }` (confirmed live). Note that some server faults carry
 * only the generic "An unexpected error occurred" — that text is a backend
 * 500, not something the person can fix, and is worded as such.
 */
export function apiErrorMessage(error, fallback) {
  if (!error?.response) {
    return error?.code === 'ECONNABORTED'
      ? `${fallback} The server took too long to respond.`
      : `${fallback} Couldn't reach the server — check your connection.`;
  }
  const { data, status } = error.response;

  const fieldErrors = Array.isArray(data?.errors)
    ? data.errors.map((e) => e?.defaultMessage || e?.message || (typeof e === 'string' ? e : null)).filter(Boolean)
    : data?.fieldErrors && typeof data.fieldErrors === 'object'
      ? Object.entries(data.fieldErrors).map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg[0] : msg}`)
      : [];
  const detail = fieldErrors.length ? fieldErrors.join('; ') : typeof data === 'string' ? data : data?.message || data?.detail;

  if (status >= 500) {
    return `${fallback} The server hit an internal error (${status}) — this is a problem on our side, not yours; please try again later.`;
  }
  if (detail) return `${fallback} ${detail}`;
  // A bare 401/403 carries no reason. Say what it usually means rather than quoting a number: the account isn't allowed to do
  // this, or the login token is being refused (which happens everywhere at once, not just here).
  if (status === 401 || status === 403) {
    return `${fallback} The server refused it (${status}) — your account may not have permission for this, or your login needs refreshing (try logging out and back in). If everything fails at once, it's a problem on the server's side.`;
  }
  return `${fallback} (server responded ${status}).`;
}
