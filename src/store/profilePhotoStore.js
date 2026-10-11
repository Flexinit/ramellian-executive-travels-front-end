import { create } from 'zustand';

const KEY_PREFIX = 'ramellian:profilePhoto:';

function storageKey(userId) {
  return `${KEY_PREFIX}${userId}`;
}

/**
 * Local-only profile picture storage, keyed per user id. There is no
 * backend endpoint to upload/persist a user avatar (confirmed against the
 * live OpenAPI spec — only `/vehicles/{id}/photos` exists), so this is a
 * `localStorage`-backed placeholder: it shows immediately across this app
 * on this device/browser, but doesn't sync anywhere else and is lost if
 * site data is cleared. Swap for a real upload once the backend adds one.
 */
const useProfilePhotoStore = create((set, get) => ({
  photoUrl: null,
  userId: null,

  /** Load the locally-stored photo (if any) for this user into state. Idempotent per user id. */
  loadForUser: (userId) => {
    if (!userId || get().userId === userId) return;
    let photoUrl = null;
    try {
      photoUrl = localStorage.getItem(storageKey(userId));
    } catch {
      // Private browsing / blocked storage — fall back to no photo.
    }
    set({ userId, photoUrl });
  },

  /** Persist a new photo (already a data URL) for the given user. */
  setPhoto: (userId, dataUrl) => {
    try {
      localStorage.setItem(storageKey(userId), dataUrl);
    } catch {
      // Storage full/blocked — the photo still shows for this session via state.
    }
    set({ userId, photoUrl: dataUrl });
  },

  /** Remove the stored photo for the given user. */
  clearPhoto: (userId) => {
    try {
      localStorage.removeItem(storageKey(userId));
    } catch {
      // Ignore — state is cleared below regardless.
    }
    set({ userId, photoUrl: null });
  },
}));

export { useProfilePhotoStore };
