import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiUpload } from '../lib/api';
import { apiErrorMessage } from './useProfile';

/**
 * Documents — confirmed against the live backend and OpenAPI spec:
 *  - `GET /documents/me` → `DocumentResponse[]` with `documentType` and
 *    `reviewStatus` (+ `reviewNotes`). The list is normalised below to the
 *    `{ type, status, rejectionReason }` shape the rest of the app reads.
 *  - `POST /documents?documentType=…` (multipart, single `file` part) — the
 *    type is a query parameter, not a form field. Only image/PDF files.
 */

/** Maps a backend `DocumentResponse` to the app's document shape (raw fields are kept too). */
export function normalizeDocument(doc) {
  return {
    ...doc,
    type: doc.documentType,
    status: doc.reviewStatus ? String(doc.reviewStatus).toUpperCase() : doc.reviewStatus,
    rejectionReason: doc.reviewNotes,
  };
}

/** How often a renter's own document list re-checks itself while a page has it open — an admin reviewing
 * it happens in a separate session entirely, so nothing here tells this one "it changed" the moment it
 * does; without this, the global default (`refetchOnWindowFocus: false`, a 5-minute `staleTime` —
 * `lib/queryClient.js`) left a just-approved/rejected document showing its old status for up to 5 minutes,
 * with a hard page reload (which throws away the whole query cache and starts fresh) the only thing that
 * visibly fixed it. Same idea as `useChat.js`'s own polling for a conversation. */
const DOCUMENTS_POLL_MS = 15_000;

/**
 * Fetches the signed-in user's uploaded documents and their review status.
 * Pass `enabled: false` to skip the request (e.g. for a visitor who isn't
 * signed in yet, where a 401 would just be noise).
 */
export function useDocuments({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => apiGet('/documents/me'),
    select: (docs) => (Array.isArray(docs) ? docs.map(normalizeDocument) : docs),
    enabled,
    refetchInterval: DOCUMENTS_POLL_MS,
    refetchOnWindowFocus: true,
  });
}

/**
 * Uploads one document as multipart form data. Pass an `onProgress(percent)`
 * callback in the mutate variables to track upload progress in the caller's
 * own state. The ID number isn't sent here — the spec puts it on
 * `ProfileRequest.idNumber` (see ProfileForm). Invalidates the documents
 * list on success so the new status shows immediately.
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ type, file, onProgress }) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiUpload(`/documents?documentType=${encodeURIComponent(type)}`, formData, onProgress);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document uploaded — pending review.');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Upload failed.'));
    },
  });
}
