import { describe, it, expect } from 'vitest';
import { IDENTITY_KINDS, currentIdentityDocument, extractIdNumber } from './identity';

describe('extractIdNumber — National ID', () => {
  it('reads "ID NUMBER: 12345678" on one line', () => {
    expect(extractIdNumber('REPUBLIC OF KENYA\nID NUMBER: 12345678\nFULL NAMES', 'NATIONAL_ID')).toBe('12345678');
  });

  it('takes the ID number, not the serial number, when both sit under their labels', () => {
    expect(extractIdNumber('SERIAL NUMBER   ID NUMBER\n234567890   12345678', 'NATIONAL_ID')).toBe('12345678');
  });

  it('fixes letters OCR mistakes for digits next to the label', () => {
    expect(extractIdNumber('ID NO. 1234567O', 'NATIONAL_ID')).toBe('12345670');
  });

  it('accepts a lone 7–8 digit number when no label was read', () => {
    expect(extractIdNumber('JOHN DOE\n12345678\n01.01.1990', 'NATIONAL_ID')).toBe('12345678');
  });

  it('gives up rather than guess between several numbers', () => {
    expect(extractIdNumber('12345678\n87654321', 'NATIONAL_ID')).toBeNull();
    expect(extractIdNumber('', 'NATIONAL_ID')).toBeNull();
  });
});

describe('extractIdNumber — Passport', () => {
  it('reads the number from the machine-readable zone when its check digit holds', () => {
    const mrz = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10';
    expect(extractIdNumber(mrz, 'PASSPORT')).toBe('L898902C3');
  });

  it('ignores a machine-readable line whose check digit fails, and falls back to the label', () => {
    expect(extractIdNumber('PASSPORT NO. AK1234567\nL898902C35UTO7408122F1204159', 'PASSPORT')).toBe('AK1234567');
  });

  it('returns null when nothing looks like a passport number', () => {
    expect(extractIdNumber('REPUBLIC OF KENYA', 'PASSPORT')).toBeNull();
  });
});

describe('IDENTITY_KINDS', () => {
  it('asks for selfies holding the ID (front and back) or the passport photo page', () => {
    const selfies = (kind) => IDENTITY_KINDS[kind].shots.filter((s) => s.selfie).map((s) => s.key);
    expect(selfies('NATIONAL_ID')).toEqual(['selfieFront', 'selfieBack']);
    expect(selfies('PASSPORT')).toEqual(['selfie']);
  });

  it('reads the number from exactly one photo of each', () => {
    expect(IDENTITY_KINDS.NATIONAL_ID.shots.filter((s) => s.ocr)).toHaveLength(1);
    expect(IDENTITY_KINDS.PASSPORT.shots.filter((s) => s.ocr)).toHaveLength(1);
  });
});

describe('currentIdentityDocument', () => {
  it('prefers the one that counts over a rejected one, whichever kind', () => {
    const docs = [{ type: 'NATIONAL_ID', status: 'REJECTED' }, { type: 'PASSPORT', status: 'PENDING' }];
    expect(currentIdentityDocument(docs).type).toBe('PASSPORT');
  });

  it('falls back to a rejected one, and ignores other documents', () => {
    expect(currentIdentityDocument([{ type: 'DRIVING_LICENSE', status: 'APPROVED' }])).toBeUndefined();
    expect(currentIdentityDocument([{ type: 'NATIONAL_ID', status: 'REJECTED' }]).status).toBe('REJECTED');
  });
});
