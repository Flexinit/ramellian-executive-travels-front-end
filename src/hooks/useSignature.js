import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiDelete, apiGet, apiUpload } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { dataUrlToBlob } from '../lib/utils';

/**
 * A person's saved signature (live spec 2026-10-16), used to sign each contract with one click:
 *  - `GET /profile/signature` → `SavedSignatureResponse` { hasSavedSignature, consentGivenAt }
 *  - `GET /profile/signature/image` → the image itself (the signed-in person's own only)
 *  - `POST /profile/signature?consent=true` (multipart `signature`) — save / replace it, agreeing it may be used
 *    to sign their rental contracts
 *  - `DELETE /profile/signature` — remove it (contracts already signed keep theirs)
 */

const KEY = ['profile', 'signature'];

export function useSavedSignature({ enabled = true } = {}) {
  return useQuery({ queryKey: KEY, queryFn: () => apiGet('/profile/signature'), enabled, retry: false });
}

/** The saved signature as an image URL for previewing (fetched with the person's token). */
export function useSavedSignatureImage(enabled) {
  return useQuery({
    queryKey: [...KEY, 'image'],
    queryFn: async () => {
      const res = await api.get('/profile/signature/image', { responseType: 'blob' });
      return URL.createObjectURL(res.data);
    },
    enabled: !!enabled,
    staleTime: Infinity,
    retry: false,
  });
}

/** Saves a signature: pass a PNG data URL (from the signature pad) or an image File. */
export function useSaveSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (signature) => {
      const formData = new FormData();
      const file = typeof signature === 'string' ? dataUrlToBlob(signature) : signature;
      formData.append('signature', file, file.name || 'signature.png');
      return apiUpload('/profile/signature?consent=true', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success('Signature saved.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't save your signature.")),
  });
}

export function useDeleteSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete('/profile/signature'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success('Saved signature removed.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't remove your signature.")),
  });
}

/**
 * The multipart body and query string for signing a contract — renter (`/sign`) or owner (`/owner-sign`):
 * `consent=true` always; either `useSavedSignature=true` (no file) or the drawn `signature`, optionally kept with
 * `saveAsProfile=true` (renter endpoint).
 * @param {{ signature?: string, useSaved?: boolean, saveAsProfile?: boolean }} opts
 */
export function signRequest({ signature, useSaved = false, saveAsProfile = false }) {
  const formData = new FormData();
  if (!useSaved && signature) formData.append('signature', dataUrlToBlob(signature), 'signature.png');
  const params = new URLSearchParams({ consent: 'true' });
  if (useSaved) params.set('useSavedSignature', 'true');
  if (!useSaved && saveAsProfile) params.set('saveAsProfile', 'true');
  return { formData, query: params.toString() };
}
