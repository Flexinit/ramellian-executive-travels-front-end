import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';

/**
 * `rental-term-controller` (live spec 2026-10-16): the platform's rental terms — short titled rules grouped by
 * `category` and ordered by `displayOrder` (`RentalTermResponse`: id, title, content, category, displayOrder,
 * enabled, createdAt, updatedAt).
 *  - `GET /rental-terms` — the enabled ones; public (no login), what renters read.
 *  - `GET /rental-terms/all` — every one, enabled or not (administrators).
 *  - `POST /rental-terms`, `PUT /rental-terms/{id}` — `RentalTermRequest` { title*, content*, category?, displayOrder? }
 *  - `PATCH /rental-terms/{id}/toggle` — switch one on or off; `DELETE /rental-terms/{id}`.
 */

const byOrder = (list) =>
  (Array.isArray(list) ? [...list] : []).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || String(a.title).localeCompare(String(b.title)));

/** The enabled terms, in order — what renters see. */
export function useRentalTerms() {
  return useQuery({ queryKey: ['rental-terms', 'enabled'], queryFn: () => apiGet('/rental-terms'), select: byOrder, staleTime: 5 * 60 * 1000 });
}

/** Every term, enabled or not (administrators). */
export function useAllRentalTerms() {
  return useQuery({ queryKey: ['rental-terms', 'all'], queryFn: () => apiGet('/rental-terms/all'), select: byOrder });
}

function useTermMutation(fn, success) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental-terms'] });
      if (success) toast.success(success);
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't save the rental term.")),
  });
}

/** Adds a term. Pass a `RentalTermRequest`. */
export const useCreateRentalTerm = () => useTermMutation((term) => apiPost('/rental-terms', term), 'Rental term added.');
/** Saves a term. Pass `{ id, ...RentalTermRequest }`. */
export const useUpdateRentalTerm = () => useTermMutation(({ id, ...term }) => apiPut(`/rental-terms/${id}`, term), 'Rental term saved.');
/** Switches a term on or off. Pass its id. */
export const useToggleRentalTerm = () => useTermMutation((id) => apiPatch(`/rental-terms/${id}/toggle`));
/** Deletes a term. Pass its id. */
export const useDeleteRentalTerm = () => useTermMutation((id) => apiDelete(`/rental-terms/${id}`), 'Rental term deleted.');

/** Who a term applies to — its `category`. Terms without one apply to Everyone. */
export const TERM_AUDIENCES = ['Everyone', 'Renters', 'Owners'];

/**
 * Terms grouped by category, in order — `[{ category, terms }]`; terms without a category come under "Everyone".
 * @param {object[]} terms
 */
export function groupRentalTerms(terms = []) {
  const groups = new Map();
  for (const t of terms) {
    const key = (t.category || '').trim() || 'Everyone';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  return [...groups.entries()].map(([category, list]) => ({ category, terms: list }));
}
