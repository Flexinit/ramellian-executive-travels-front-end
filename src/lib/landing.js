import { USER_ROLES } from './constants';

/**
 * Where a person lands after signing in. The login form asks only for email and password — the
 * account's roles (from the access token) decide the rest:
 *  - an administrator (ADMIN / SUPER_ADMIN) opens the Admin Panel;
 *  - someone who owns vehicles (OWNER / MANAGER) opens the Owner Panel, or the renter Dashboard if that
 *    is the side they last used on this browser (the left menu has a switch between the two);
 *  - anyone else opens the renter Dashboard;
 *  - unless they arrived through "List Your Car" (Register with `?as=owner`), in which case the next login
 *    opens the Owner Panel — where a new owner is taken through the setup steps — whoever they are.
 */

const KEY_PREFIX = 'ramellian.side.';

/** Whether these roles can use the owner side of the portal. */
export const canOwn = (roles = []) => roles.includes(USER_ROLES.OWNER) || roles.includes(USER_ROLES.MANAGER);

/** @param {string} userId @returns {'renter'|'owner'|null} the side this person last used on this browser */
export function getLastSide(userId) {
  if (!userId) return null;
  try {
    const value = window.localStorage.getItem(KEY_PREFIX + userId);
    return value === 'renter' || value === 'owner' ? value : null;
  } catch {
    return null;
  }
}

const INTENT_KEY = 'ramellian.intent';

/** Notes that this visitor came in through "List Your Car" (kept for this browser tab only). */
export function rememberOwnerIntent() {
  try {
    window.sessionStorage.setItem(INTENT_KEY, 'owner');
  } catch {
    // storage unavailable — they simply land by their roles
  }
}

/** Whether the person who just signed in came in through "List Your Car"; reading it uses it up. */
export function takeOwnerIntent() {
  try {
    const wanted = window.sessionStorage.getItem(INTENT_KEY) === 'owner';
    window.sessionStorage.removeItem(INTENT_KEY);
    return wanted;
  } catch {
    return false;
  }
}

/** Remembers which side (renter / owner) a person is using, so the next login opens on it. */
export function rememberSide(userId, side) {
  if (!userId || (side !== 'renter' && side !== 'owner')) return;
  try {
    window.localStorage.setItem(KEY_PREFIX + userId, side);
  } catch {
    // storage unavailable — the next login just opens on the default side
  }
}

/**
 * The side a fresh login opens on: null for an administrator (no sides); 'owner' for someone who came in
 * through "List Your Car"; 'renter' for someone who can't own; and for an owner the remembered side,
 * defaulting to 'owner'.
 * @param {string[]} roles
 * @param {'renter'|'owner'|null} remembered
 * @param {boolean} [wantsOwner]
 * @returns {'renter'|'owner'|null}
 */
export function sideAtLogin(roles = [], remembered = null, wantsOwner = false) {
  if (roles.includes(USER_ROLES.ADMIN)) return null;
  if (wantsOwner) return 'owner';
  if (!canOwn(roles)) return 'renter';
  return remembered === 'renter' ? 'renter' : 'owner';
}

/** The page a person opens on, given their roles and the side they're using. */
export function homeFor(side, roles = []) {
  if (roles.includes(USER_ROLES.ADMIN)) return '/admin';
  if (side === 'owner' || (canOwn(roles) && side !== 'renter')) return '/owner';
  return '/dashboard';
}
