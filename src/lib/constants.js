/**
 * Application-wide constants.
 * All objects are frozen to prevent accidental mutation.
 */

/** Booking modes */
export const BOOKING_MODES = Object.freeze({
  SELF_DRIVE: 'SELF_DRIVE',
  CHAUFFEURED: 'CHAUFFEURED',
});

/**
 * A booking's trip type — must match the backend's `VehicleRequest`/`VehicleResponse.tripTypes` enum
 * (`lib/vehicleOptions.js`'s `VEHICLE_TRIP_TYPES`, confirmed against the live OpenAPI spec) exactly.
 * Previously had `CORPORATE_EVENT` where the backend expects `CORPORATE`, and was missing `GENERAL`. Which trip
 * types a given vehicle can be booked for is `vehicleOptions.js`'s `bookableTripTypes` (General = any trip);
 * the backend itself no longer refuses a mismatch (tested live 2026-10-08).
 */
export const TRIP_TYPES = Object.freeze({
  GENERAL:             'GENERAL',
  AIRPORT_TRANSFER:    'AIRPORT_TRANSFER',
  WEDDING:             'WEDDING',
  CORPORATE:           'CORPORATE',
  SAFARI:              'SAFARI',
  FAMILY_JOURNEY:      'FAMILY_JOURNEY',
  SELF_DRIVE_RENTAL:   'SELF_DRIVE_RENTAL',
  CAKE_TRANSPORTATION: 'CAKE_TRANSPORTATION',
});

/** Human-readable labels for trip types (for UI dropdowns) */
export const TRIP_TYPE_LABELS = Object.freeze({
  [TRIP_TYPES.GENERAL]:             'General',
  [TRIP_TYPES.AIRPORT_TRANSFER]:    'Airport Transfer',
  [TRIP_TYPES.WEDDING]:             'Wedding',
  [TRIP_TYPES.CORPORATE]:           'Corporate',
  [TRIP_TYPES.SAFARI]:              'Safari',
  [TRIP_TYPES.FAMILY_JOURNEY]:      'Family Journey',
  [TRIP_TYPES.SELF_DRIVE_RENTAL]:   'Self-Drive Rental',
  [TRIP_TYPES.CAKE_TRANSPORTATION]: 'Cake Transportation',
});

/** Sort options for vehicle search */
export const SORT_OPTIONS = Object.freeze([
  { value: 'recommended',  label: 'Recommended' },
  { value: 'newest',       label: 'Newest' }, // sorted in the portal — the backend refuses it (lib/vehicleRanking.js)
  { value: 'price_asc',    label: 'Price: Low to High' },
  { value: 'price_desc',   label: 'Price: High to Low' },
  { value: 'rating_desc',  label: 'Top Rated' },
  { value: 'capacity_desc',label: 'Most Seats' },
]);

/** Fuel types */
export const FUEL_TYPES = Object.freeze({
  PETROL:   'PETROL',
  DIESEL:   'DIESEL',
  ELECTRIC: 'ELECTRIC',
  HYBRID:   'HYBRID',
});

/**
 * Fuel-tank levels recorded at vehicle pickup/return handover (see VehicleHandoverForm) — a different
 * concept from `FUEL_TYPES` above (what the vehicle runs on, not how full its tank is right now).
 * Confirmed against the live `vehicle-handover-controller` spec 2026-10-02 (docs/backend-requests.md item 22).
 */
export const FUEL_LEVELS = Object.freeze({
  EMPTY:          'EMPTY',
  QUARTER:        'QUARTER',
  HALF:           'HALF',
  THREE_QUARTERS: 'THREE_QUARTERS',
  FULL:           'FULL',
});

/** Human-readable labels for FUEL_LEVELS (for the handover form's dropdown). */
export const FUEL_LEVEL_LABELS = Object.freeze({
  [FUEL_LEVELS.EMPTY]:          'Empty',
  [FUEL_LEVELS.QUARTER]:        '1/4 Tank',
  [FUEL_LEVELS.HALF]:           '1/2 Tank',
  [FUEL_LEVELS.THREE_QUARTERS]: '3/4 Tank',
  [FUEL_LEVELS.FULL]:           'Full',
});

/** Transmission types */
export const TRANSMISSION_TYPES = Object.freeze({
  AUTOMATIC: 'AUTOMATIC',
  MANUAL:    'MANUAL',
});

/** Vehicle tiers */
export const VEHICLE_TIERS = Object.freeze({
  STANDARD:  'STANDARD',
  EXECUTIVE: 'EXECUTIVE',
});

/** User roles */
export const USER_ROLES = Object.freeze({
  RENTER:  'RENTER',
  OWNER:   'OWNER',
  MANAGER: 'MANAGER',
  ADMIN:   'ADMIN',
});

/**
 * The backend names its roles differently from this app's canonical
 * `USER_ROLES` (confirmed against a live token: a car owner's roles claim is
 * `["CAR_OWNER"]`, not `["OWNER"]`). Incoming roles are normalised through
 * this map in authStore so every role check in the app keeps using the
 * canonical names.
 */
const BACKEND_ROLE_ALIASES = Object.freeze({
  CAR_OWNER:   USER_ROLES.OWNER,
  CAR_RENTER:  USER_ROLES.RENTER,
  // Confirmed live: the account felixwanzetse@gmail.com carries `["SUPER_ADMIN", "MANAGE", "CAR_OWNER"]`.
  // A super admin is an administrator here, and the backend spells the manager role `MANAGE`.
  SUPER_ADMIN: USER_ROLES.ADMIN,
  MANAGE:      USER_ROLES.MANAGER,
});

/** @param {string[]} [roles] @returns {string[]} roles mapped to canonical `USER_ROLES` names, de-duplicated */
export function normalizeRoles(roles) {
  return [...new Set((roles || []).map((r) => BACKEND_ROLE_ALIASES[r] || r))];
}

/**
 * Human-readable labels for role badges (e.g. UserMenu, OwnerDashboardPage).
 * Ordered by display priority — when a user holds more than one role, the
 * first matching entry here is the one shown.
 */
export const ROLE_LABELS = Object.freeze({
  [USER_ROLES.ADMIN]:   'Administrator',
  [USER_ROLES.MANAGER]: 'Fleet Manager',
  [USER_ROLES.OWNER]:   'Car Owner',
  [USER_ROLES.RENTER]:  'Renter',
});

/**
 * Role names exactly as the backend spells them (they appear in the access token and in
 * `GET /users/admin`), with the labels an administrator sees when managing accounts. A plain renter
 * account carries no role at all. `ADMIN` has not been seen on a live account yet (only `SUPER_ADMIN`,
 * `MANAGE`, `CAR_OWNER` and `CAR_RENTER` have), and the spec doesn't list the values
 * `PUT /users/admin/{id}/role` accepts — if the backend refuses one, its message is shown.
 */
export const BACKEND_ROLE_LABELS = Object.freeze({
  SUPER_ADMIN: 'Super Admin',
  ADMIN:       'Administrator',
  MANAGE:      'Fleet Manager',
  CAR_OWNER:   'Car Owner',
  CAR_RENTER:  'Car Renter',
});

/** The roles an administrator can give an account, in the order they're offered. */
export const ASSIGNABLE_ROLES = Object.freeze(['CAR_RENTER', 'CAR_OWNER', 'MANAGE', 'ADMIN', 'SUPER_ADMIN']);

/**
 * Account type — the backend's `ownerType`, which it also uses to decide
 * whether business documents may be uploaded ("Business documents require a
 * BUSINESS owner profile").
 */
export const ACCOUNT_TYPES = Object.freeze({
  INDIVIDUAL: 'INDIVIDUAL',
  BUSINESS:   'BUSINESS',
});

/**
 * Document types accepted by `POST /documents?documentType=…`. Found by
 * probing the live backend (the spec only says "string"): anything else
 * returns "Invalid document type". Note the backend spells it
 * DRIVING_LICENSE (with an S). VEHICLE_REGISTRATION also exists but is a
 * per-vehicle document (needs `vehicleId`), so it isn't listed here.
 */
export const DOCUMENT_TYPES = Object.freeze({
  NATIONAL_ID:           'NATIONAL_ID',
  PASSPORT:              'PASSPORT',
  DRIVING_LICENSE:       'DRIVING_LICENSE',
  PROOF_OF_ADDRESS:      'PROOF_OF_ADDRESS',
  BUSINESS_REGISTRATION: 'BUSINESS_REGISTRATION',
  TAX_CERTIFICATE:       'TAX_CERTIFICATE',
});

/** Readable names for the backend's document types (see DOCUMENT_TYPES). */
export const DOCUMENT_TYPE_LABELS = Object.freeze({
  NATIONAL_ID:           'National ID',
  PASSPORT:              'Passport',
  DRIVING_LICENSE:       'Driving Licence',
  PROOF_OF_ADDRESS:      'Proof of Address',
  BUSINESS_REGISTRATION: 'Business Registration Certificate',
  TAX_CERTIFICATE:       'Tax Certificate',
  VEHICLE_REGISTRATION:  'Vehicle Registration',
});

/** Document statuses */
export const DOCUMENT_STATUSES = Object.freeze({
  PENDING:  'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

/** Booking statuses */
export const BOOKING_STATUSES = Object.freeze({
  PENDING:   'PENDING',
  CONFIRMED: 'CONFIRMED',
  ACTIVE:    'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED:   'EXPIRED',
  REJECTED:  'REJECTED',
});

/**
 * How a booking's trip dates relate to right now — a client-side filter (`bookingPeriodMatches` in
 * `lib/utils.js`), the same way `BOOKING_STATUSES` backs the status filter, since the bookings list
 * endpoints (`/bookings/mine`, `/bookings/owner`, and the admin report) return everything at once with no
 * date filter of their own.
 */
export const BOOKING_PERIODS = Object.freeze({
  UPCOMING: 'UPCOMING',
  ONGOING:  'ONGOING',
  PAST:     'PAST',
});

/** Human-readable labels for the period filter (for its dropdown). */
export const BOOKING_PERIOD_LABELS = Object.freeze({
  [BOOKING_PERIODS.UPCOMING]: 'Upcoming',
  [BOOKING_PERIODS.ONGOING]:  'Ongoing',
  [BOOKING_PERIODS.PAST]:     'Past',
});

/** Payment statuses from Pesapal */
export const PAYMENT_STATUSES = Object.freeze({
  PENDING:    'PENDING',
  SUCCESSFUL: 'SUCCESSFUL',
  FAILED:     'FAILED',
  INVALID:    'INVALID',
});

/** Pending booking expiry in milliseconds (15 min) */
export const BOOKING_EXPIRY_MS = 15 * 60 * 1000;

/** Payment status polling interval in milliseconds */
export const PAYMENT_POLL_INTERVAL_MS = 3000;

/** Maximum payment status poll attempts */
export const PAYMENT_POLL_MAX_ATTEMPTS = 10;

/** TanStack Query stale time (5 min) */
export const QUERY_STALE_TIME = 5 * 60 * 1000;

/** TanStack Query GC time (10 min) */
export const QUERY_GC_TIME = 10 * 60 * 1000;

/** Renter notes max length */
export const RENTER_NOTES_MAX_LENGTH = 1000;

/** Pickup/drop-off location max length — a free-text field, same kind of cap as renter notes. */
export const BOOKING_LOCATION_MAX_LENGTH = 255;

/** Search debounce delay in ms */
export const SEARCH_DEBOUNCE_MS = 300;
