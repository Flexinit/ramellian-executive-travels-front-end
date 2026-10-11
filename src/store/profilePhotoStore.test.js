import { describe, it, expect, beforeEach } from 'vitest';
import { useProfilePhotoStore } from './profilePhotoStore';

const getStore = () => useProfilePhotoStore.getState();

describe('profilePhotoStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useProfilePhotoStore.setState({ photoUrl: null, userId: null });
  });

  it('starts with no photo loaded', () => {
    expect(getStore().photoUrl).toBeNull();
    expect(getStore().userId).toBeNull();
  });

  it('loadForUser is a no-op when nothing is stored', () => {
    getStore().loadForUser('u1');
    expect(getStore().photoUrl).toBeNull();
    expect(getStore().userId).toBe('u1');
  });

  it('setPhoto persists the data URL to localStorage and state', () => {
    getStore().setPhoto('u1', 'data:image/png;base64,abc');
    expect(getStore().photoUrl).toBe('data:image/png;base64,abc');
    expect(localStorage.getItem('ramellian:profilePhoto:u1')).toBe('data:image/png;base64,abc');
  });

  it('loadForUser reads a previously stored photo back into state', () => {
    getStore().setPhoto('u1', 'data:image/png;base64,abc');
    useProfilePhotoStore.setState({ photoUrl: null, userId: null });
    getStore().loadForUser('u1');
    expect(getStore().photoUrl).toBe('data:image/png;base64,abc');
  });

  it('loadForUser is idempotent for the same already-loaded user', () => {
    getStore().setPhoto('u1', 'data:image/png;base64,abc');
    getStore().loadForUser('u1');
    expect(getStore().photoUrl).toBe('data:image/png;base64,abc');
  });

  it('clearPhoto removes the stored photo', () => {
    getStore().setPhoto('u1', 'data:image/png;base64,abc');
    getStore().clearPhoto('u1');
    expect(getStore().photoUrl).toBeNull();
    expect(localStorage.getItem('ramellian:profilePhoto:u1')).toBeNull();
  });

  it('keeps photos separate per user', () => {
    getStore().setPhoto('u1', 'data:image/png;base64,one');
    getStore().setPhoto('u2', 'data:image/png;base64,two');
    expect(localStorage.getItem('ramellian:profilePhoto:u1')).toBe('data:image/png;base64,one');
    expect(localStorage.getItem('ramellian:profilePhoto:u2')).toBe('data:image/png;base64,two');
  });
});
