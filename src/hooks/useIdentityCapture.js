import { useRef, useState } from 'react';
import { DOCUMENT_TYPES } from '../lib/constants';
import { IDENTITY_KINDS, readIdNumber } from '../lib/identity';
import { composePanels } from '../lib/composeFrontBack';
import { useUploadDocument } from './useDocuments';
import { useUpdateProfile } from './useProfile';

const IDLE = { status: 'idle', number: '' };

/**
 * Collecting an identity document — National ID or Passport, whichever the person has — shared by the
 * Documents page card and the checkout prompt. The ID / passport number is read off the photo in the
 * browser and can't be typed or changed: if it can't be read, the person retakes a clearer photo. It's
 * saved to the profile (`ProfileRequest.idNumber`) and the photos — document plus the selfies holding it —
 * go up as one combined image under the chosen document type.
 *
 * @param {string} currentIdNumber — the profile's saved ID number, so it isn't re-sent unchanged
 */
export function useIdentityCapture(currentIdNumber = '') {
  const [kind, setKind] = useState(DOCUMENT_TYPES.NATIONAL_ID);
  const [shots, setShots] = useState({});
  const [ocr, setOcr] = useState(IDLE);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'composing' | 'saving' | 'uploading'
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const readToken = useRef(0);
  const upload = useUploadDocument();
  const updateProfile = useUpdateProfile();

  const spec = IDENTITY_KINDS[kind];
  const complete = spec.shots.every((s) => shots[s.key]) && ocr.status === 'read';

  function chooseKind(next) {
    if (next === kind) return;
    readToken.current += 1;
    setKind(next);
    setShots({});
    setOcr(IDLE);
    setError('');
  }

  /** Back to a fresh start (National ID, no photos). */
  function reset() {
    readToken.current += 1;
    setKind(DOCUMENT_TYPES.NATIONAL_ID);
    setShots({});
    setOcr(IDLE);
    setError('');
  }

  async function setShot(key, file) {
    setShots((prev) => ({ ...prev, [key]: file || undefined }));
    setError('');
    if (!spec.shots.find((s) => s.key === key)?.ocr) return;

    const token = ++readToken.current;
    if (!file) {
      setOcr(IDLE);
      return;
    }
    setOcr({ status: 'reading', number: '' });
    const number = await readIdNumber(file, kind).catch(() => null);
    if (token !== readToken.current) return; // a newer photo (or kind) replaced this one meanwhile
    setOcr(number ? { status: 'read', number } : { status: 'failed', number: '' });
  }

  /** Saves the number and uploads the combined photos. Resolves true once uploaded. */
  async function submit() {
    if (!complete) return false;
    setError('');
    try {
      setPhase('composing');
      const combined = await composePanels(spec.shots.map((s) => ({ file: shots[s.key], label: s.panel })));
      const file = new File([combined], `${kind.toLowerCase()}.jpg`, { type: 'image/jpeg' });
      if (ocr.number !== currentIdNumber) {
        setPhase('saving');
        await updateProfile.mutateAsync({ idNumber: ocr.number });
      }
      setPhase('uploading');
      setProgress(0);
      await upload.mutateAsync({ type: kind, file, onProgress: setProgress });
      setPhase('idle');
      return true;
    } catch (err) {
      setPhase('idle');
      setError(err?.message || 'Could not upload your identity document. Please try again.');
      return false;
    }
  }

  return { kind, spec, chooseKind, reset, shots, setShot, ocr, complete, submit, phase, busy: phase !== 'idle', progress, error };
}
