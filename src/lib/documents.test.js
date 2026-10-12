import { describe, it, expect } from 'vitest';
import { getDocumentSlots, isRenterUser, missingRequiredDocuments } from './documents';

const types = (slots) => slots.map((s) => s.type);

describe('getDocumentSlots', () => {
  it('asks an Individual for identity and proof of address only — no driving licence unless they rent cars', () => {
    expect(types(getDocumentSlots('INDIVIDUAL'))).toEqual(['IDENTITY', 'PROOF_OF_ADDRESS']);
  });

  it('adds the driving licence for car renters', () => {
    expect(types(getDocumentSlots('INDIVIDUAL', { isRenter: true }))).toEqual([
      'IDENTITY',
      'DRIVING_LICENSE',
      'PROOF_OF_ADDRESS',
    ]);
  });

  it('treats a missing or unknown account type as Individual', () => {
    expect(types(getDocumentSlots(undefined))).toEqual(types(getDocumentSlots('INDIVIDUAL')));
  });

  it('offers the registration and tax certificates to a Business, but neither is required (a business need not be a limited company)', () => {
    const business = getDocumentSlots('BUSINESS');
    expect(business.find((s) => s.type === 'BUSINESS_REGISTRATION').required).toBe(false);
    expect(business.find((s) => s.type === 'TAX_CERTIFICATE').required).toBe(false);
  });

  it('lists the registration and tax certificates for a Business', () => {
    expect(types(getDocumentSlots('BUSINESS'))).toEqual([
      'IDENTITY',
      'PROOF_OF_ADDRESS',
      'BUSINESS_REGISTRATION',
      'TAX_CERTIFICATE',
    ]);
  });

  it('asks for one identity document — a National ID or a Passport, not both', () => {
    const identity = getDocumentSlots('INDIVIDUAL').filter((s) => s.identity);
    expect(identity).toHaveLength(1);
    expect(identity[0].required).toBe(true);
  });
});

describe('missingRequiredDocuments', () => {
  it('reports the identity document when nothing is uploaded', () => {
    expect(missingRequiredDocuments([])).toEqual(['Identity document']);
  });

  it('accepts either a National ID or a Passport, even while pending', () => {
    expect(missingRequiredDocuments([{ type: 'PASSPORT', status: 'PENDING' }])).toEqual([]);
    expect(missingRequiredDocuments([{ type: 'NATIONAL_ID', status: 'APPROVED' }])).toEqual([]);
  });

  it('does not count a rejected document', () => {
    expect(missingRequiredDocuments([{ type: 'NATIONAL_ID', status: 'REJECTED' }])).toEqual(['Identity document']);
  });

  it('needs only the identity document, whatever the account type — business certificates are optional', () => {
    expect(missingRequiredDocuments([{ type: 'NATIONAL_ID', status: 'APPROVED' }])).toEqual([]);
  });
});

describe('isRenterUser', () => {
  it('is true for the Renter role or the isCarRenter flag', () => {
    expect(isRenterUser({ roles: ['RENTER'] })).toBe(true);
    expect(isRenterUser({ roles: ['OWNER'], isCarRenter: true })).toBe(true);
  });

  it('is false for an owner-only account, and for no user', () => {
    expect(isRenterUser({ roles: ['OWNER'], isCarRenter: false })).toBe(false);
    expect(isRenterUser(null)).toBe(false);
  });
});
