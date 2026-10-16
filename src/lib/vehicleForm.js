import { z } from 'zod';
import { FUEL_TYPES, TRANSMISSION_TYPES } from './constants';

/**
 * The rules and defaults of the vehicle form, shared by adding a vehicle (pages/AddVehiclePage.jsx) and editing one
 * (pages/EditVehiclePage.jsx), so the two can never disagree about what a vehicle needs.
 */

function titleCase(value) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export const FUEL_OPTIONS = Object.values(FUEL_TYPES).map((v) => ({ value: v, label: titleCase(v) }));
export const TRANSMISSION_OPTIONS = Object.values(TRANSMISSION_TYPES).map((v) => ({ value: v, label: titleCase(v) }));

/** Errors for the "specific dates" option: both a start and an end are needed, and the end must come after. */
export function windowErrors({ availabilityMode, availableFrom, availableTo }) {
  if (availabilityMode !== 'dates') return {};
  const errors = {};
  if (!availableFrom) errors.availableFrom = 'Choose the date and time it becomes available';
  if (!availableTo) errors.availableTo = 'Choose the date and time it stops being available';
  else if (availableFrom && new Date(availableTo) <= new Date(availableFrom)) errors.availableTo = 'The end must be after the start';
  return errors;
}

/**
 * Required fields are exactly `VehicleRequest.required` in the live spec:
 * color, fuelType, location, model, pricePerDay, registrationNumber,
 * transmissionType, vin. The spec does NOT list `capacity` as required, but
 * the live backend answers 400 "request format or parameter values are
 * invalid" without it (verified), so the form asks for it anyway.
 */
export const vehicleSchema = z
  .object({
    model: z.string().min(1, 'Enter the vehicle model'),
    vin: z.string().min(1, 'Enter the VIN'),
    registrationNumber: z.string().min(1, 'Enter the registration number'),
    location: z.string().min(1, 'Enter a location'),
    // A blank box must not quietly become 0 (z.coerce turns "" into 0) — the price is required.
    pricePerDay: z.preprocess(
      (v) => (v === '' || v === null ? undefined : v),
      z.coerce.number({ invalid_type_error: 'Enter a price', required_error: 'Enter a price' }).min(0, 'Must be 0 or more')
    ),
    capacity: z.preprocess(
      (v) => (v === '' || v === null ? undefined : v),
      z.coerce.number({ invalid_type_error: 'Enter seat capacity', required_error: 'Enter seat capacity' }).int().min(1, 'Must be at least 1')
    ),
    color: z.string().min(1, 'Enter a color'),
    fuelType: z.string().min(1, 'Select a fuel type'),
    transmissionType: z.string().min(1, 'Select a transmission'),
    selfDrive: z.boolean(),
    chauffeured: z.boolean(),
    available: z.boolean(),
    // Optional in the spec. Product rule: an owner says whether the vehicle is always available or only on
    // specific dates — and for specific dates, both the start and the end (date and time) must be given.
    availabilityMode: z.enum(['always', 'dates']),
    availableFrom: z.string().optional(),
    availableTo: z.string().optional(),
    hasWorkingAC: z.boolean(),
    // Product rule (not in the spec): no vehicle without comprehensive insurance. The sticker photo
    // that proves it is a file picked outside the form (see `stickerFile`), also mandatory.
    comprehensiveInsurance: z.boolean().refine((v) => v === true, 'Every vehicle must have comprehensive insurance'),
    // Optional in the spec (VehicleRequest.year / insurer / policyNumber, live 2026-10-16) — shown on the contract.
    year: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.coerce.number({ invalid_type_error: 'Enter the year as a number' }).int('Enter a whole year, e.g. 2019').optional()
    ),
    insurer: z.string().trim().optional(),
    policyNumber: z.string().trim().optional(),
    tripTypes: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    Object.entries(windowErrors(data)).forEach(([path, message]) => ctx.addIssue({ code: 'custom', path: [path], message }));
  })
  // Product rule: picking no booking mode isn't an error — it means the vehicle offers both.
  .transform((data) => (data.selfDrive || data.chauffeured ? data : { ...data, selfDrive: true, chauffeured: true }));

// Every field has a default, so an emptied form reads as pristine (not "dirty") and the draft clears properly.
export const VEHICLE_DEFAULTS = {
  model: '',
  vin: '',
  registrationNumber: '',
  location: '',
  pricePerDay: '',
  capacity: '',
  color: '',
  fuelType: '',
  transmissionType: '',
  selfDrive: true,
  chauffeured: false,
  available: true,
  availabilityMode: 'always',
  availableFrom: '',
  availableTo: '',
  hasWorkingAC: false,
  comprehensiveInsurance: false,
  year: '',
  insurer: '',
  policyNumber: '',
  tripTypes: [],
};


/** An ISO instant as the `datetime-local` box wants it (`2026-10-01T09:00`, in the browser's own time zone). */
function toLocalInput(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The form's starting values for a vehicle that already exists (a `VehicleResponse`). */
export function vehicleToFormValues(vehicle = {}) {
  const hasWindow = !!(vehicle.availableFrom || vehicle.availableTo);
  return {
    ...VEHICLE_DEFAULTS,
    model: vehicle.model || '',
    vin: vehicle.vin || '',
    registrationNumber: vehicle.registrationNumber || '',
    location: vehicle.location || '',
    pricePerDay: vehicle.pricePerDay ?? '',
    capacity: vehicle.capacity ?? '',
    color: vehicle.color || '',
    fuelType: vehicle.fuelType || '',
    transmissionType: vehicle.transmissionType || '',
    selfDrive: !!vehicle.selfDrive,
    chauffeured: !!vehicle.chauffeured,
    available: vehicle.available !== false,
    availabilityMode: hasWindow ? 'dates' : 'always',
    availableFrom: toLocalInput(vehicle.availableFrom),
    availableTo: toLocalInput(vehicle.availableTo),
    hasWorkingAC: !!vehicle.hasWorkingAC,
    comprehensiveInsurance: !!vehicle.comprehensiveInsurance,
    year: vehicle.year ?? '',
    insurer: vehicle.insurer || '',
    policyNumber: vehicle.policyNumber || '',
    tripTypes: Array.isArray(vehicle.tripTypes) ? vehicle.tripTypes : [],
  };
}
