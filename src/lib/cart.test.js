import { describe, it, expect } from 'vitest';
import {
  billableDays,
  lineTotal,
  cartTotal,
  vehicleSnapshot,
  modeProblem,
  onlyMode,
  contactProblem,
  missingBookingDocuments,
} from './cart';

describe('billableDays', () => {
  it('counts whole days', () => {
    expect(billableDays('2026-10-01T09:00:00Z', '2026-10-04T09:00:00Z')).toBe(3);
  });

  it('charges every started 24 hours as a day', () => {
    expect(billableDays('2026-10-01T09:00:00Z', '2026-10-04T10:00:00Z')).toBe(4);
  });

  it('charges a same-day trip as one day, never zero', () => {
    expect(billableDays('2026-10-01T09:00:00Z', '2026-10-01T17:00:00Z')).toBe(1);
  });

  it('is zero without both dates, or when the end is not after the start', () => {
    expect(billableDays(null, '2026-10-04T09:00:00Z')).toBe(0);
    expect(billableDays('2026-10-01T09:00:00Z', undefined)).toBe(0);
    expect(billableDays('2026-10-04T09:00:00Z', '2026-10-01T09:00:00Z')).toBe(0);
    expect(billableDays('2026-10-01T09:00:00Z', '2026-10-01T09:00:00Z')).toBe(0);
  });
});

describe('prices', () => {
  const item = (dailyPrice, start, end) => ({ startTime: start, endTime: end, vehicle: { dailyPrice } });
  const a = item(15000, '2026-10-01T09:00:00Z', '2026-10-04T09:00:00Z'); // 3 days
  const b = item(8000, '2026-10-02T09:00:00Z', '2026-10-03T09:00:00Z'); // 1 day

  it('multiplies the daily price by the days', () => {
    expect(lineTotal(a)).toBe(45000);
  });

  it('is zero when the price or dates are missing', () => {
    expect(lineTotal({ startTime: a.startTime, endTime: a.endTime, vehicle: {} })).toBe(0);
    expect(lineTotal(item(15000, null, null))).toBe(0);
  });

  it('adds up every vehicle in the selection', () => {
    expect(cartTotal([a, b])).toBe(53000);
    expect(cartTotal([])).toBe(0);
  });
});

describe('vehicleSnapshot', () => {
  it('keeps only what a basket line needs, using the first photo and the normalised price', () => {
    const snap = vehicleSnapshot({
      id: 'v1', model: 'Prado', pricePerDay: 9000, photos: ['a.jpg', 'b.jpg'], vin: 'SECRET', registrationNumber: 'KDA', ownerEmail: 'o@x.com',
    });
    expect(snap).toMatchObject({ id: 'v1', model: 'Prado', dailyPrice: 9000, photos: ['a.jpg'], ownerEmail: 'o@x.com' });
    expect(snap).not.toHaveProperty('vin');
    expect(snap).not.toHaveProperty('registrationNumber');
  });
});

describe('booking mode rules', () => {
  it('refuses a mode the vehicle does not offer', () => {
    expect(modeProblem({ selfDrive: false, chauffeured: true }, 'SELF_DRIVE')).toMatch(/chauffeur/i);
    expect(modeProblem({ selfDrive: true, chauffeured: false }, 'CHAUFFEURED')).toMatch(/self-drive/i);
  });

  it('allows any mode when the vehicle offers both or does not say', () => {
    expect(modeProblem({ selfDrive: true, chauffeured: true }, 'SELF_DRIVE')).toBeNull();
    expect(modeProblem({}, 'CHAUFFEURED')).toBeNull();
  });

  it('names the only mode a vehicle offers, or none when there is a choice', () => {
    expect(onlyMode({ selfDrive: false, chauffeured: true })).toBe('CHAUFFEURED');
    expect(onlyMode({ selfDrive: true, chauffeured: false })).toBe('SELF_DRIVE');
    expect(onlyMode({ selfDrive: true, chauffeured: true })).toBeNull();
    expect(onlyMode({})).toBeNull();
  });
});

describe('contactProblem', () => {
  it('needs an email address to look like one', () => {
    expect(contactProblem('email', '')).toMatch(/enter your email/i);
    expect(contactProblem('email', 'nope')).toMatch(/valid email/i);
    expect(contactProblem('email', ' me@example.com ')).toBeNull();
  });

  it('needs a phone number, and only limits its length (the backend decides what is valid)', () => {
    expect(contactProblem('phone', '   ')).toMatch(/enter your phone/i);
    expect(contactProblem('phone', '0712 345 678')).toBeNull();
    expect(contactProblem('phone', '1'.repeat(31))).toMatch(/30 characters/i);
  });
});

describe('missingBookingDocuments', () => {
  const doc = (type, status = 'APPROVED') => ({ type, status });
  const chauffeured = [{ bookingMode: 'CHAUFFEURED' }];
  const selfDrive = [{ bookingMode: 'SELF_DRIVE' }];

  it('needs an approved identity document for every booking', () => {
    expect(missingBookingDocuments(chauffeured, [])).toHaveLength(1);
    expect(missingBookingDocuments(chauffeured, [doc('NATIONAL_ID', 'PENDING')])).toHaveLength(1);
    expect(missingBookingDocuments(chauffeured, [doc('NATIONAL_ID')])).toEqual([]);
    expect(missingBookingDocuments(chauffeured, [doc('PASSPORT')])).toEqual([]);
  });

  it('also needs an approved driving licence when any vehicle is self-drive', () => {
    expect(missingBookingDocuments(selfDrive, [doc('NATIONAL_ID')])).toEqual([expect.stringMatching(/driving licence/i)]);
    expect(missingBookingDocuments([...chauffeured, ...selfDrive], [doc('NATIONAL_ID'), doc('DRIVING_LICENSE')])).toEqual([]);
  });
});
