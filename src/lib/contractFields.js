import { formatCurrency, formatDate, formatDateTime } from './utils';
import { TRIP_TYPE_LABELS, BOOKING_MODES } from './constants';

/**
 * Fills a contract template's `{{field}}`s (docs/contract-templates/vehicle-rental-agreement.md) with this
 * booking's own details, for the renter reading it before they accept and sign.
 *
 * IMPORTANT — what this does and doesn't do: the backend doesn't fill these in itself (tested live 2026-10-09,
 * docs/backend-requests.md item 37), so this fills them in **on screen only**. The contract the backend stores
 * and turns into the signed PDF is still the template's own text. Item 37 asks the backend to do the same
 * filling when it drafts the contract; once it does, the text arrives already filled and this has nothing
 * left to replace.
 *
 * Deliberately left blank here (`BLANK`): anything the renter's own view doesn't have — the owner's name and
 * business details (the portal never gives a renter the owner's profile), and the vehicle's registration and
 * VIN (kept from renters everywhere else in the portal, see VehicleDetailPage) — and anything not stored at
 * all yet (vehicle year, insurer, policy number, licence number, destination, passengers).
 */

export const BLANK = '__________';

const yesNo = (v) => (v == null ? undefined : v ? 'Yes' : 'No');
const titleCase = (s) => (s ? String(s).charAt(0) + String(s).slice(1).toLowerCase().replace(/_/g, ' ') : undefined);
const money = (n) => (n == null ? undefined : formatCurrency(n));
const fullName = (p) => [p?.firstName, p?.middleName, p?.lastName].filter(Boolean).join(' ') || undefined;

function postponementTerms(policy) {
  if (!policy) return undefined;
  if (policy.postponementAllowed === false) return 'Not allowed';
  if (policy.postponementAllowed !== true) return undefined;
  const parts = ['Allowed'];
  if (policy.postponementDeadlineHours != null) parts.push(`up to ${policy.postponementDeadlineHours} hours before pick-up`);
  if (policy.maxPostponements != null) parts.push(`at most ${policy.maxPostponements} time${policy.maxPostponements === 1 ? '' : 's'}`);
  return parts.join(', ');
}

/**
 * The value for each `{{field}}`, from what the renter's own view has.
 * @param {{ booking?: object, vehicle?: object, renter?: object, policy?: object, now?: Date }} sources
 * @returns {Record<string, string|undefined>}
 */
export function contractValues({ booking = {}, vehicle = {}, renter = {}, policy, now = new Date() }) {
  const mode = booking.bookingMode;
  return {
    booking_reference: booking.id,
    agreement_date: formatDate(now),
    booking_created_date_time: booking.createdAt ? formatDateTime(booking.createdAt) : undefined,

    renter_full_name: fullName(renter) || booking.renterName,
    renter_id_number: renter.idNumber,
    renter_location: renter.location,

    vehicle_model: vehicle.model,
    vehicle_colour: vehicle.color,
    vehicle_seats: vehicle.capacity != null ? String(vehicle.capacity) : undefined,
    vehicle_fuel_type: titleCase(vehicle.fuelType),
    vehicle_transmission: titleCase(vehicle.transmissionType),
    vehicle_air_conditioning: yesNo(vehicle.hasWorkingAC),
    vehicle_location: vehicle.location,
    vehicle_id: vehicle.id,

    booking_mode: mode === BOOKING_MODES.CHAUFFEURED ? 'Chauffeured' : mode === BOOKING_MODES.SELF_DRIVE ? 'Self-drive' : undefined,
    trip_type: booking.tripType ? TRIP_TYPE_LABELS[booking.tripType] || titleCase(booking.tripType) : undefined,
    start_date_time: booking.startTime ? formatDateTime(booking.startTime) : undefined,
    end_date_time: booking.endTime ? formatDateTime(booking.endTime) : undefined,
    pickup_location: booking.pickupLocation,
    dropoff_location: booking.dropoffLocation,
    number_of_days: booking.numberOfDays != null ? String(booking.numberOfDays) : undefined,
    delivery_requested: yesNo(booking.deliveryRequested),
    chauffeur_name: booking.chauffeurName || booking.chauffeurEmail || (mode === BOOKING_MODES.CHAUFFEURED ? 'To be assigned' : 'Not applicable'),
    renter_notes: booking.renterNotes || 'None',
    dispatcher_notes: booking.dispatcherNotes || 'None',

    daily_rate: money(vehicle.pricePerDay ?? vehicle.dailyPrice),
    rental_amount: money(booking.baseAmount),
    delivery_fee: money(booking.deliveryRequested ? booking.deliveryFee ?? 0 : 0),
    total_amount: money(booking.estimatedAmount),

    free_cancellation_hours: policy?.freeCancellationWindowHours != null ? String(policy.freeCancellationWindowHours) : undefined,
    cancellation_deadline_hours: policy?.cancellationDeadlineHours != null ? String(policy.cancellationDeadlineHours) : undefined,
    late_cancellation_refund_percent: policy?.lateCancellationRefundPct != null ? String(policy.lateCancellationRefundPct) : undefined,
    postponement_terms: postponementTerms(policy),
  };
}

/**
 * Replaces every `{{field}}` in `text` with its value, or a blank line to write on when there's none — never
 * leaving a raw `{{…}}` in what the renter reads. Text without any fields comes back unchanged.
 * @param {string} text
 * @param {Record<string, string|undefined>} values
 */
export function fillContractText(text, values) {
  if (!text) return text;
  return text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key) => {
    const value = values[key];
    return value == null || value === '' ? BLANK : String(value);
  });
}
