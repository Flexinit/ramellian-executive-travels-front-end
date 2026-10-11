/**
 * When a verification code was last sent to an email address, so the
 * countdown on the Verify email page keeps its true remaining time across a
 * reload instead of restarting from the full minute. Kept in sessionStorage
 * (this tab only, gone when it closes); it's a timestamp, not form input.
 */
export const CODE_WINDOW_SECONDS = 60;

const key = (email) => `ret.codeSentAt.${String(email || '').trim().toLowerCase()}`;

/** Records "a code was just sent to this email". */
export function markCodeSent(email, at = Date.now()) {
  try {
    sessionStorage.setItem(key(email), String(at));
  } catch {
    /* storage unavailable — the timer just restarts on reload */
  }
}

/** @returns {number|null} ms timestamp the last code was sent, if known */
export function getCodeSentAt(email) {
  try {
    const raw = sessionStorage.getItem(key(email));
    const at = raw === null ? NaN : Number(raw);
    return Number.isFinite(at) ? at : null;
  } catch {
    return null;
  }
}

export function clearCodeSent(email) {
  try {
    sessionStorage.removeItem(key(email));
  } catch {
    /* nothing to clear */
  }
}
