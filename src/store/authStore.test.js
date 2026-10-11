import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';

const getStore = () => useAuthStore.getState();
const TOKEN_STORAGE_KEY = 'auth:token';

function makeJwt(payload) {
  const base64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'HS384' })}.${base64url(payload)}.fake-signature`;
}

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('starts with null token and user', () => {
    const { token, user } = getStore();
    expect(token).toBeNull();
    expect(user).toBeNull();
  });

  it('isAuthenticated returns false when no token', () => {
    expect(getStore().isAuthenticated()).toBe(false);
  });

  it('setToken stores the token', () => {
    getStore().setToken('my-jwt-token');
    expect(getStore().token).toBe('my-jwt-token');
  });

  it('isAuthenticated returns true after setToken', () => {
    getStore().setToken('my-jwt-token');
    expect(getStore().isAuthenticated()).toBe(true);
  });

  it('setToken seeds the user from the token\'s own claims', () => {
    const token = makeJwt({ userId: 'u1', email: 'owner@example.com', roles: ['OWNER'], enabled: true });
    getStore().setToken(token);
    expect(getStore().user).toEqual({
      id: 'u1',
      email: 'owner@example.com',
      roles: ['OWNER'],
      enabled: true,
      permissions: [],
    });
  });

  it('setToken leaves user untouched when the token has no decodable claims', () => {
    getStore().setUser({ id: '1', email: 'test@example.com' });
    getStore().setToken('not-a-real-jwt');
    expect(getStore().user).toEqual({ id: '1', email: 'test@example.com' });
  });

  it('setUser stores the user object', () => {
    const user = { id: '1', email: 'test@example.com', roles: ['RENTER'] };
    getStore().setUser(user);
    expect(getStore().user).toEqual(user);
  });

  it('setUser merges into the existing user rather than replacing it', () => {
    getStore().setUser({ id: '1', email: 'test@example.com', roles: ['RENTER'] });
    getStore().setUser({ firstName: 'Test', lastName: 'User' });
    expect(getStore().user).toEqual({
      id: '1',
      email: 'test@example.com',
      roles: ['RENTER'],
      firstName: 'Test',
      lastName: 'User',
    });
  });

  it('clearAuth resets token and user to null', () => {
    getStore().setToken('tok');
    getStore().setUser({ id: '1', email: 't@t.com', roles: ['RENTER'] });
    getStore().clearAuth();
    expect(getStore().token).toBeNull();
    expect(getStore().user).toBeNull();
  });

  it('isAuthenticated returns false after clearAuth', () => {
    getStore().setToken('tok');
    getStore().clearAuth();
    expect(getStore().isAuthenticated()).toBe(false);
  });

  it("maps the backend's CAR_OWNER / CAR_RENTER role names to the app's OWNER / RENTER", () => {
    const token = makeJwt({ userId: 'u1', email: 'a@example.com', roles: ['CAR_OWNER'], enabled: true });
    getStore().setToken(token);
    expect(getStore().user.roles).toEqual(['OWNER']);

    getStore().setUser({ roles: ['CAR_OWNER', 'CAR_RENTER'] });
    expect(getStore().user.roles).toEqual(['OWNER', 'RENTER']);
  });

  it('leaves roles the app already knows untouched', () => {
    getStore().setUser({ roles: ['ADMIN', 'MANAGER'] });
    expect(getStore().user.roles).toEqual(['ADMIN', 'MANAGER']);
  });

  it('mirrors the token into sessionStorage, so it can survive a full page reload', () => {
    getStore().setToken('tok');
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBe('tok');
  });

  it('removes the mirrored token from sessionStorage on clearAuth', () => {
    getStore().setToken('tok');
    getStore().clearAuth();
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});

describe('authStore — rehydrating from sessionStorage at module load', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it(
    "restores the token and user from a token already in sessionStorage — this is what makes " +
      "PaymentSuccessPage survive Pesapal's own full-page redirect, which wipes in-memory state the same way closing the tab would",
    async () => {
      const token = makeJwt({ userId: 'u1', email: 'a@example.com', roles: ['CAR_RENTER'], enabled: true });
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);

      vi.resetModules();
      const { useAuthStore: freshStore } = await import('./authStore');

      expect(freshStore.getState().token).toBe(token);
      expect(freshStore.getState().user).toEqual({
        id: 'u1',
        email: 'a@example.com',
        roles: ['RENTER'],
        enabled: true,
        permissions: [],
      });
    }
  );

  it('starts signed out when sessionStorage has no token', async () => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);

    vi.resetModules();
    const { useAuthStore: freshStore } = await import('./authStore');

    expect(freshStore.getState().token).toBeNull();
    expect(freshStore.getState().user).toBeNull();
  });
});
