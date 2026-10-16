import { describe, it, expect } from 'vitest';
import { signRequest } from './useSignature';

describe('signRequest (live spec 2026-10-16)', () => {
  it('signs with the saved signature: no file, useSavedSignature and consent', () => {
    const { formData, query } = signRequest({ useSaved: true });
    expect(query).toBe('consent=true&useSavedSignature=true');
    expect(formData.has('signature')).toBe(false);
  });

  it('signs with a drawn signature, optionally keeping it for next time', () => {
    const drawn = 'data:image/png;base64,aGk=';
    expect(signRequest({ signature: drawn }).query).toBe('consent=true');
    const keep = signRequest({ signature: drawn, saveAsProfile: true });
    expect(keep.query).toBe('consent=true&saveAsProfile=true');
    expect(keep.formData.get('signature')).toBeInstanceOf(Blob);
  });
});
