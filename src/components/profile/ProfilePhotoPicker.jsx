import React, { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';

/**
 * Click-to-upload profile picture, overlaid on the Avatar it wraps.
 * Local-only for now (see useProfilePhoto.js) — there's no backend endpoint
 * to persist a user avatar yet (confirmed against the live OpenAPI spec:
 * only `/vehicles/{id}/photos` exists), so the image is read as a data URL
 * and stored in this browser's localStorage. It updates everywhere the
 * Avatar is shown (this page, the account menu) immediately, but won't
 * follow the account to another device or browser.
 *
 * @param {string} name — for initials fallback and alt text
 * @param {'sm'|'md'|'lg'|'xl'} size
 */
export default function ProfilePhotoPicker({ name, size = 'xl' }) {
  const { photoUrl, setPhoto, clearPhoto } = useProfilePhoto();
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setIsSaving(true);
    try {
      await setPhoto(file);
    } catch (error) {
      toast.error(error.message || 'Could not update your photo.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="relative inline-flex shrink-0">
      <Avatar name={name} src={photoUrl} size={size} />

      {isSaving && (
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      )}

      <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-brand-gold text-brand-dark flex items-center justify-center border-2 border-brand-dark hover:bg-brand-gold-light transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-brand-gold">
        <Camera size={13} aria-hidden="true" />
        <span className="sr-only">{photoUrl ? 'Change profile photo' : 'Upload profile photo'}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isSaving}
          className="sr-only"
        />
      </label>

      {photoUrl && (
        <button
          type="button"
          onClick={clearPhoto}
          aria-label="Remove profile photo"
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-navy border border-white/20 text-brand-grey hover:text-brand-white flex items-center justify-center focus-ring"
        >
          <X size={11} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
