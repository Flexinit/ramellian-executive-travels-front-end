import { BACKEND_ROLE_LABELS } from './constants';

/** The roles the portal itself relies on (their names are used to decide menus and pages), so changing or deleting one needs care. */
export const BUILT_IN_ROLES = Object.freeze(Object.keys(BACKEND_ROLE_LABELS));

/** A role's name for people: the portal's own label for the roles it knows, otherwise `FLEET_SUPERVISOR` → `Fleet supervisor`. */
export function roleTitle(name) {
  if (BACKEND_ROLE_LABELS[name]) return BACKEND_ROLE_LABELS[name];
  const words = String(name || '').replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** `VEHICLE_APPROVE` → `VEHICLE`; a name with no underscore goes under `OTHER`. */
export function permissionGroup(name) {
  const i = String(name || '').indexOf('_');
  return i > 0 ? name.slice(0, i) : 'OTHER';
}

/** `VEHICLE_APPROVE` → `Approve` (the part after the group), for showing under its group heading. */
export function permissionAction(name) {
  const i = String(name || '').indexOf('_');
  const rest = i > 0 ? name.slice(i + 1) : name;
  const words = rest.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Permission names gathered by their group, groups A–Z and names A–Z inside each.
 * @param {string[]} names
 * @returns {Array<{ group: string, names: string[] }>}
 */
export function groupPermissions(names = []) {
  const groups = new Map();
  [...new Set(names)].sort().forEach((name) => {
    const group = permissionGroup(name);
    groups.set(group, [...(groups.get(group) || []), name]);
  });
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([group, list]) => ({ group, names: list }));
}

/** Whether a role or permission matches what an administrator typed in a search box. */
export function matchesNameSearch(text, ...fields) {
  const needle = String(text || '').trim().toLowerCase();
  return !needle || fields.some((f) => String(f || '').toLowerCase().includes(needle));
}
