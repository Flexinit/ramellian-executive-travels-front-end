import { describe, it, expect } from 'vitest';
import { decodeJwt } from './jwt';

function makeJwt(payload) {
  const base64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'HS384' })}.${base64url(payload)}.fake-signature`;
}

describe('decodeJwt', () => {
  it('decodes a well-formed token payload', () => {
    const token = makeJwt({ roles: ['RENTER'], email: 'test@example.com', userId: 'abc-123', enabled: true });
    expect(decodeJwt(token)).toEqual({
      roles: ['RENTER'],
      email: 'test@example.com',
      userId: 'abc-123',
      enabled: true,
    });
  });

  it('decodes unicode characters correctly', () => {
    const token = makeJwt({ email: 'nairobi-café@example.com' });
    expect(decodeJwt(token)).toEqual({ email: 'nairobi-café@example.com' });
  });

  it('returns null for a non-JWT string', () => {
    expect(decodeJwt('mock-jwt-token')).toBeNull();
  });

  it('returns null for garbage in the payload segment', () => {
    expect(decodeJwt('aaa.not-valid-base64!!.bbb')).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(decodeJwt(null)).toBeNull();
    expect(decodeJwt(undefined)).toBeNull();
  });
});
