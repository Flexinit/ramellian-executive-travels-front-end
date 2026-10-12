import { describe, it, expect } from 'vitest';
import { BLANK, contractValues, fillContractText } from './contractFields';

const booking = {
  id: 'bk-1',
  bookingMode: 'CHAUFFEURED',
  tripType: 'WEDDING',
  startTime: '2027-03-22T09:00:00Z',
  endTime: '2027-03-24T09:00:00Z',
  pickupLocation: 'JKIA Terminal 1A',
  dropoffLocation: 'Westlands',
  numberOfDays: 2,
  deliveryRequested: true,
  deliveryFee: 1500,
  baseAmount: 30000,
  estimatedAmount: 31500,
  renterName: 'Ann R',
};
const vehicle = { id: 'v1', model: 'Mercedes Benz', color: 'Black', capacity: 8, fuelType: 'DIESEL', transmissionType: 'AUTOMATIC', hasWorkingAC: true, location: 'Roysambu', pricePerDay: 15000, registrationNumber: 'KDA 123A', vin: 'VIN-1' };
const renter = { firstName: 'Ann', middleName: 'Wanjiru', lastName: 'Renter', idNumber: '12345678', location: 'Nairobi' };
const policy = { freeCancellationWindowHours: 24, cancellationDeadlineHours: 6, lateCancellationRefundPct: 50, postponementAllowed: true, postponementDeadlineHours: 12, maxPostponements: 1 };

const values = contractValues({ booking, vehicle, renter, policy, now: new Date('2027-03-01T10:00:00Z') });

describe('contract fields', () => {
  it('fills in the renter, vehicle, trip and charges', () => {
    expect(values).toMatchObject({
      booking_reference: 'bk-1',
      renter_full_name: 'Ann Wanjiru Renter',
      renter_id_number: '12345678',
      vehicle_model: 'Mercedes Benz',
      vehicle_fuel_type: 'Diesel',
      vehicle_air_conditioning: 'Yes',
      booking_mode: 'Chauffeured',
      trip_type: 'Wedding',
      pickup_location: 'JKIA Terminal 1A',
      number_of_days: '2',
      delivery_requested: 'Yes',
      free_cancellation_hours: '24',
      late_cancellation_refund_percent: '50',
      postponement_terms: 'Allowed, up to 12 hours before pick-up, at most 1 time',
    });
    expect(values.delivery_fee).toMatch(/1,500/);
    expect(values.total_amount).toMatch(/31,500/);
  });

  it('names the exact vehicle — registration and VIN — since the agreement has to identify it', () => {
    expect(fillContractText('Reg {{vehicle_registration}} VIN {{vehicle_vin}}', values)).toBe('Reg KDA 123A VIN VIN-1');
  });

  it("collects and returns at the vehicle's own location when it isn't delivered and no place was given", () => {
    const v = contractValues({ booking: { deliveryRequested: false }, vehicle });
    expect(v.pickup_location).toBe('Roysambu');
    expect(v.dropoff_location).toBe('Roysambu');
    expect(contractValues({ booking: { deliveryRequested: true }, vehicle }).pickup_location).toBeUndefined();
  });

  it('replaces every field, leaving a blank line rather than a raw code for anything unknown', () => {
    const text = 'Renter: {{renter_full_name}} (ID {{ renter_id_number }}). Owner: {{owner_full_name}}.';
    expect(fillContractText(text, values)).toBe(`Renter: Ann Wanjiru Renter (ID 12345678). Owner: ${BLANK}.`);
  });

  it('leaves a contract without fields exactly as it was', () => {
    expect(fillContractText('Rental agreement\n\nTerms and conditions apply', values)).toBe('Rental agreement\n\nTerms and conditions apply');
  });
});
