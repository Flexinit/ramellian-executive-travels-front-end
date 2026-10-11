/**
 * Unsaved-form drafts, kept in this browser's localStorage so a page reload
 * (or coming back later) doesn't make someone start a form from scratch.
 *
 * Deliberately NOT used for the login, verify-email and 2FA forms, and never
 * for passwords. Drafts are keyed per user where the form belongs to a
 * signed-in user, and expire after a week. They are kept across logout and
 * login on purpose (the login token lives only in memory, so a reload signs the
 * person out — they must find their half-filled form when they log back in).
 * Storage can be blocked or full — every call swallows that and the form just
 * starts blank.
 */
const PREFIX = 'ret.draft.';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function saveDraft(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ t: Date.now(), data }));
  } catch {
    /* storage unavailable — the draft simply isn't kept */
  }
}

/** @returns {any|null} the saved draft, or null if none, unreadable, or older than a week */
export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { t, data } = JSON.parse(raw);
    if (typeof t !== 'number' || Date.now() - t > MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return data ?? null;
  } catch {
    return null;
  }
}

export function clearDraft(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* nothing to clear */
  }
}

/** The localStorage key prefix, exported for stores that persist through their own middleware. */
export const DRAFT_PREFIX = PREFIX;
