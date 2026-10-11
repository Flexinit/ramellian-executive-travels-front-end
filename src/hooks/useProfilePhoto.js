import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useProfilePhotoStore } from '../store/profilePhotoStore';

/** Keeps localStorage well under typical browser quotas. */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/**
 * The signed-in user's profile picture — local-only until the backend has a
 * real upload endpoint (see profilePhotoStore.js). Auto-loads the stored
 * photo for whichever account is currently signed in.
 */
export function useProfilePhoto() {
  const userId = useAuthStore((s) => s.user?.id);
  const photoUrl = useProfilePhotoStore((s) => s.photoUrl);
  const storeUserId = useProfilePhotoStore((s) => s.userId);
  const loadForUser = useProfilePhotoStore((s) => s.loadForUser);
  const setPhotoInStore = useProfilePhotoStore((s) => s.setPhoto);
  const clearPhotoInStore = useProfilePhotoStore((s) => s.clearPhoto);

  useEffect(() => {
    if (userId) loadForUser(userId);
  }, [userId, loadForUser]);

  const setPhoto = useCallback(
    (file) =>
      new Promise((resolve, reject) => {
        if (!userId) {
          reject(new Error('Not signed in.'));
          return;
        }
        if (!file.type.startsWith('image/')) {
          reject(new Error('Please choose an image file.'));
          return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          reject(new Error('Image is too large (max 2MB).'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setPhotoInStore(userId, reader.result);
          resolve();
        };
        reader.onerror = () => reject(new Error('Could not read that file.'));
        reader.readAsDataURL(file);
      }),
    [userId, setPhotoInStore]
  );

  const clearPhoto = useCallback(() => {
    if (userId) clearPhotoInStore(userId);
  }, [userId, clearPhotoInStore]);

  return {
    photoUrl: storeUserId === userId ? photoUrl : null,
    setPhoto,
    clearPhoto,
  };
}
