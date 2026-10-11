import { BOOKING_MODES, DOCUMENT_STATUSES, DOCUMENT_TYPES } from './constants';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Days a trip is charged for, used for the price shown BEFORE a booking exists: every started 24 hours
 * counts, with a minimum of one day. The backend's own `numberOfDays` / `estimatedAmount` on the created
 * booking is what is actually charged, so this is always shown as an estimate.
 * @param {string|Date} start
 * @param {string|Date} end
 * @returns {number} 0 when either date is missing or the end is not after the start
 */
export function billableDays(start, end) {
  const s = start ? new Date(start).getTime() : NaN;
  const e = end ? new Date(end).getTime() : NaN;
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
  return Math.max(1, Math.ceil((e - s) / MS_PER_DAY));
}

/** @param {{ startTime?: string, endTime?: string, vehicle?: { dailyPrice?: number } }} item */
export function lineTotal(item) {
  const rate = Number(item?.vehicle?.dailyPrice);
  if (!Number.isFinite(rate)) return 0;
  return rate * billableDays(item?.startTime, item?.endTime);
}

/** @param {object[]} items */
export function cartTotal(items = []) {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

/** The few vehicle details a cart line needs, so the cart can be shown without loading every vehicle again. */
export function vehicleSnapshot(vehicle) {
  const photo = vehicle?.photos?.[0];
  return {
    id: vehicle.id,
    model: vehicle.model,
    dailyPrice: vehicle.dailyPrice ?? vehicle.pricePerDay,
    location: vehicle.location,
    tier: vehicle.tier,
    ownerEmail: vehicle.ownerEmail,
    availableFrom: vehicle.availableFrom,
    availableTo: vehicle.availableTo,
    photos: photo ? [photo] : [],
  };
}

/**
 * Why a vehicle can't be booked in the chosen mode, or null. `selfDrive` / `chauffeured` come from the
 * backend's `VehicleResponse`; a vehicle that doesn't say either way is not restricted.
 */
export function modeProblem(vehicle, bookingMode) {
  if (bookingMode === BOOKING_MODES.SELF_DRIVE && vehicle?.selfDrive === false) return 'This vehicle is only available with a chauffeur.';
  if (bookingMode === BOOKING_MODES.CHAUFFEURED && vehicle?.chauffeured === false) return 'This vehicle is only available for self-drive.';
  return null;
}

/** The mode a vehicle can only be booked in, or null when the renter has a choice. */
export function onlyMode(vehicle) {
  if (vehicle?.selfDrive === false && vehicle?.chauffeured !== false) return BOOKING_MODES.CHAUFFEURED;
  if (vehicle?.chauffeured === false && vehicle?.selfDrive !== false) return BOOKING_MODES.SELF_DRIVE;
  return null;
}

/** How a renter can be reached before they have an account. */
export const CONTACT_KINDS = Object.freeze({ PHONE: 'phone', EMAIL: 'email' });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Why a phone number / email address can't be used as the booking contact, or null. Deliberately light:
 * the backend decides what a valid phone number is (its spec only limits the profile phone to 30 characters).
 * @param {'phone'|'email'} kind
 * @param {string} value
 */
export function contactProblem(kind, value) {
  const text = String(value ?? '').trim();
  if (kind === CONTACT_KINDS.EMAIL) {
    if (!text) return 'Enter your email address';
    return EMAIL_PATTERN.test(text) ? null : 'Enter a valid email address';
  }
  if (!text) return 'Enter your phone number';
  return text.length > 30 ? 'Phone number must be 30 characters or fewer' : null;
}

/**
 * Which documents a booking still needs approved before pickup: an identity document always, and a driving
 * licence when any item is self-drive. No longer something the backend insists on before it'll create the
 * booking at all (confirmed live 2026-10-06 — see docs/backend-requests.md item 29's follow-up and
 * `useStartNextBooking`'s own doc comment), so this is read as a non-blocking heads-up on checkout
 * (`BookingCheckoutPage`'s own "Upload now" notice) rather than something `DocumentGateModal` gates on.
 * @param {object[]} items
 * @param {Array<{type: string, status: string}>} documents
 * @returns {string[]}
 */
export function missingBookingDocuments(items = [], documents = []) {
  const approved = (type) => documents.some((d) => d.type === type && d.status === DOCUMENT_STATUSES.APPROVED);
  const missing = [];
  if (!approved(DOCUMENT_TYPES.NATIONAL_ID) && !approved(DOCUMENT_TYPES.PASSPORT)) {
    missing.push('An approved identity document (National ID or Passport)');
  }
  if (items.some((i) => i.bookingMode === BOOKING_MODES.SELF_DRIVE) && !approved(DOCUMENT_TYPES.DRIVING_LICENSE)) {
    missing.push('An approved driving licence (needed for self-drive)');
  }
  return missing;
}
