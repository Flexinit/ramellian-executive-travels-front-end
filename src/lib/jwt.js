/**
 * Decodes a JWT's payload without verifying its signature — reading claims
 * client-side is safe (the token was issued by the backend and is only
 * trusted for what it already grants via the Authorization header; nothing
 * here is a security boundary). Confirmed against a real access token that
 * the backend embeds `roles`, `permissions`, `userId`, `email`, and
 * `enabled` directly in the token, so the frontend doesn't need a round
 * trip to `GET /users/me` just to know who's signed in and what role they
 * have.
 *
 * @param {string} token
 * @returns {Record<string, unknown> | null} the decoded payload, or null if the token isn't a well-formed JWT
 */
export function decodeJwt(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('binary');
    const percentEncoded = Array.from(json)
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('');
    return JSON.parse(decodeURIComponent(percentEncoded));
  } catch {
    return null;
  }
}
