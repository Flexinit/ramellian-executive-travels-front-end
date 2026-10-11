import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { apiErrorMessage } from './useProfile';

/**
 * Contract templates for administrators — the `/contract-templates/admin` endpoints of the live spec:
 *  - `GET /contract-templates/admin` → `ContractTemplateResponse[]` (`id`, `ownerId`, `name`, `version`, `status`, `content`)
 *  - `POST /contract-templates/admin` `{ name, content }` — add a template
 *  - `PUT /contract-templates/admin/{id}/review` `{ status }` — approve or reject one
 * The spec has no update or delete for a template, so a change is saved as a new template (the backend keeps a `version`).
 */

const KEY = ['contract-templates'];

export function useContractTemplates() {
  return useQuery({ queryKey: KEY, queryFn: () => apiGet('/contract-templates/admin') });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiPost('/contract-templates/admin', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success('Template saved.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not save the template.')),
  });
}

/** Approves or rejects a template. Pass `{ id, status: 'APPROVED'|'REJECTED' }`. */
export function useReviewTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => apiPut(`/contract-templates/admin/${id}/review`, { status }),
    onSuccess: (data, { status }) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success(status === 'APPROVED' ? 'Template approved.' : 'Template rejected.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't save that review.")),
  });
}

/**
 * A car owner's own contract templates — `GET /contract-templates/mine` → `ContractTemplateResponse[]`, and
 * `POST /contract-templates/owner` `{ name, content }` to add one (it then waits for an administrator's review).
 */
const MINE = ['contract-templates', 'mine'];

export function useMyContractTemplates() {
  return useQuery({ queryKey: MINE, queryFn: () => apiGet('/contract-templates/mine') });
}

export function useCreateOwnerTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => apiPost('/contract-templates/owner', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MINE });
      toast.success('Template sent for review.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not save the template.')),
  });
}
