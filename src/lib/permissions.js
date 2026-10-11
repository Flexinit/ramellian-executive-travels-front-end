/**
 * Permissions the backend puts in the access token's `permissions` claim (confirmed against a live
 * token for felixwanzetse@gmail.com, roles SUPER_ADMIN / MANAGE / CAR_OWNER). The role decides which
 * MENU a person gets (renter / owner / admin); these decide which items in it they actually see.
 */
export const PERMISSIONS = Object.freeze({
  BOOKING_READ:    'BOOKING_READ',
  BOOKING_MANAGE:  'BOOKING_MANAGE',
  DOCUMENT_READ:   'DOCUMENT_READ',
  DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD',
  VEHICLE_CREATE:  'VEHICLE_CREATE',
  VEHICLE_UPDATE:  'VEHICLE_UPDATE',
  VEHICLE_MANAGE:  'VEHICLE_MANAGE',
  USER_MANAGE:     'USER_MANAGE',
  DOCUMENT_REVIEW: 'DOCUMENT_REVIEW',
  PERMISSION_MANAGE: 'PERMISSION_MANAGE',
});

/**
 * Whether something that asks for `required` permissions (ANY of them is enough) is available to a
 * person holding `granted`. Nothing required means available to everyone. A token that carries no
 * permission list at all (an older or minimal token) is judged by role alone rather than being
 * shown an empty menu.
 *
 * @param {string[]|undefined} required
 * @param {string[]|undefined} granted
 * @returns {boolean}
 */
export function hasPermission(required, granted) {
  if (!required || required.length === 0) return true;
  if (!granted || granted.length === 0) return true;
  return required.some((permission) => granted.includes(permission));
}
