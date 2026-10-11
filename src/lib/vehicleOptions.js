import { formatDateTime } from './utils';

/**
 * The backend's own trip-type enum for `VehicleRequest.tripTypes` /
 * `VehicleResponse.tripTypes`, confirmed against the live OpenAPI spec
 * (`/v3/api-docs`). Kept in sync with `constants.js`'s `TRIP_TYPES` (used for a
 * booking's own `tripType` field), so the two enums must use the exact same values.
 */
export const VEHICLE_TRIP_TYPES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'AIRPORT_TRANSFER', label: 'Airport Transfer' },
  { value: 'WEDDING', label: 'Wedding' },
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'SAFARI', label: 'Safari' },
  { value: 'FAMILY_JOURNEY', label: 'Family Journey' },
  { value: 'SELF_DRIVE_RENTAL', label: 'Self-Drive Rental' },
  { value: 'CAKE_TRANSPORTATION', label: 'Cake Transportation' },
];

/** A trip type's display label, falling back to a tidied version of the code for a value we don't know. */
export function tripTypeLabel(value) {
  const known = VEHICLE_TRIP_TYPES.find((t) => t.value === value)?.label;
  if (known) return known;
  const words = String(value || '').toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * If the owner limited a vehicle to specific dates (`availableFrom` / `availableTo`),
 * a message saying so when the wanted trip falls outside them — otherwise null.
 * @param {object} vehicle
 * @param {string|Date} start — trip start
 * @param {string|Date} end — trip end
 */
export function bookingWindowProblem(vehicle, start, end) {
  const from = vehicle?.availableFrom ? new Date(vehicle.availableFrom) : null;
  const to = vehicle?.availableTo ? new Date(vehicle.availableTo) : null;
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const outside = (from && s && s < from) || (to && e && e > to);
  if (!outside) return null;
  const range = [from && `from ${formatDateTime(from)}`, to && `until ${formatDateTime(to)}`].filter(Boolean).join(' ');
  return `This vehicle can only be booked ${range}. Please choose dates within that time.`;
}

/**
 * The trip types a renter may book `vehicle` for. Its owner's own list (`vehicle.tripTypes` — see
 * `VehicleInfoPanel`'s "Suited for"), except that an empty list (not restricted) or one including **General**
 * means any trip at all: "General" is an all-purpose car, so a Wedding or a Safari is fine too. Tested live
 * 2026-10-08: the backend itself accepts any trip type on any vehicle (Wedding on a General-only car went
 * through), so this is the portal's own rule, and General must not be read as "General trips only".
 * @param {object} vehicle
 * @returns {string[]}
 */
export function bookableTripTypes(vehicle) {
  const own = Array.isArray(vehicle?.tripTypes) ? vehicle.tripTypes : [];
  if (own.length === 0 || own.includes('GENERAL')) return VEHICLE_TRIP_TYPES.map((t) => t.value);
  return own;
}

/**
 * If `tripType` isn't one the vehicle can be booked for (`bookableTripTypes`), a message naming the ones it
 * can — otherwise null. Used both before adding to the cart (`AddToBookingPanel`) and again at checkout
 * (`BookingCheckoutPage`, in case the owner changed the vehicle's types after it was added).
 * @param {object} vehicle
 * @param {string|null|undefined} tripType
 */
export function tripTypeProblem(vehicle, tripType) {
  if (!tripType) return null;
  const supported = bookableTripTypes(vehicle);
  if (supported.includes(tripType)) return null;
  const list = supported.map(tripTypeLabel).join(', ');
  return `${vehicle?.model || 'This vehicle'} doesn't support ${tripTypeLabel(tripType)} trips — it's only set up for: ${list}.`;
}

/**
 * Whether `vehicle` belongs to `user` (the backend puts the owner's email on
 * every `VehicleResponse` as `ownerEmail`). An owner can't book their own vehicle.
 */
export function isOwnVehicle(vehicle, user) {
  const owner = String(vehicle?.ownerEmail || '').trim().toLowerCase();
  const me = String(user?.email || '').trim().toLowerCase();
  return !!owner && !!me && owner === me;
}
