import { BACKEND_ROLE_LABELS } from './constants';

/** The name to show for an account: full name if it has one, else its email. */
export function userDisplayName(user) {
  const name = [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(' ');
  return name || user?.email || 'Unnamed account';
}

/**
 * The role labels to show for an account. A plain renter account carries no role at all
 * (confirmed on the live backend), so an empty list reads as "Car Renter".
 * @param {string[]} [roles] the backend's role names
 * @returns {string[]}
 */
export function roleBadges(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return [BACKEND_ROLE_LABELS.CAR_RENTER];
  return roles.map((role) => BACKEND_ROLE_LABELS[role] || role);
}

/** Whether an account matches what an administrator typed into the search box (name or email). */
export function matchesUserSearch(user, text) {
  const needle = text.trim().toLowerCase();
  if (!needle) return true;
  return [userDisplayName(user), user.email, user.phoneNumber].some((field) => String(field || '').toLowerCase().includes(needle));
}
