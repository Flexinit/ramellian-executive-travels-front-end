import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiGet, apiPut } from '../lib/api';
import { apiErrorMessage } from './useProfile';
import { forgetReview, recordReview } from '../lib/documentReviews';

/**
 * Document review for administrators — the `/documents/admin` endpoints of the live spec:
 *  - `GET /documents/admin/pending` → `DocumentResponse[]` waiting for review
 *  - `PUT /documents/admin/{id}/review` `{ status, notes? }` — approve or reject one (or, unverified, send it back to PENDING)
 *  - `GET /documents/{id}/content` — the uploaded file itself (fetched with the login token)
 * A `DocumentResponse` doesn't say whose document it is, so the review list can only describe the file.
 */

const KEY = ['admin', 'documents', 'pending'];

export function usePendingDocuments() {
  return useQuery({ queryKey: KEY, queryFn: () => apiGet('/documents/admin/pending') });
}

/** What a review can set a document to. `PENDING` sends a decided document back into the review queue. */
export const REVIEW_STATUSES = Object.freeze({ APPROVED: 'APPROVED', REJECTED: 'REJECTED', PENDING: 'PENDING' });

const REVIEW_MESSAGES = {
  APPROVED: 'Document approved.',
  REJECTED: 'Document rejected.',
  PENDING: 'Sent back to pending review.',
};

/**
 * Approves, rejects — or reverses — a document's review. Pass `{ id, status, notes?, document }`, where `status`
 * is `'APPROVED'`, `'REJECTED'` or `'PENDING'` (sends it back to the review queue) and `document` is the record
 * being reviewed. Each approve/reject is remembered in this browser (see lib/documentReviews.js) so the
 * Approved / Rejected pages can list it later, and `PENDING` forgets it again. The spec doesn't say which
 * statuses the backend accepts; if it refuses one, its message is shown and nothing is changed here.
 */
export function useReviewDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }) => apiPut(`/documents/admin/${id}/review`, { status, ...(notes ? { notes } : {}) }),
    onSuccess: (data, { id, status, notes, document }) => {
      if (status === REVIEW_STATUSES.PENDING) forgetReview(id);
      else if (document) recordReview(document, status, notes || '');
      queryClient.invalidateQueries({ queryKey: KEY });
      queryClient.invalidateQueries({ queryKey: ['documents'] }); // the reviewer's own documents list shows their status too
      toast.success(REVIEW_MESSAGES[status] || 'Review saved.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't save that review.")),
  });
}

/** Downloads a document's file and returns it as a blob (the caller turns it into an object URL). */
export const fetchDocumentFile = (id) => api.get(`/documents/${id}/content`, { responseType: 'blob' }).then((r) => r.data);

/**
 * The file behind a document record as a local object URL, fetched once and kept (so the inline preview and
 * the full-size viewer share one download). The file endpoint answers `application/octet-stream`, so the file
 * is given back the type its record says it has — otherwise a PDF would download instead of showing.
 * @param {{ id: string, contentType?: string }} document
 */
export function useDocumentFileUrl(document) {
  return useQuery({
    queryKey: ['admin', 'document-file', document?.id],
    queryFn: async () => {
      const blob = await fetchDocumentFile(document.id);
      return URL.createObjectURL(document.contentType ? new Blob([blob], { type: document.contentType }) : blob);
    },
    enabled: !!document?.id,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}
