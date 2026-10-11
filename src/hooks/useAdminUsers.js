import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiDelete, apiGet, apiPut } from '../lib/api';
import { apiErrorMessage } from './useProfile';

/**
 * User management for administrators — the `/users/admin` endpoints of the live spec:
 *  - `GET /users/admin` → `UserResponse[]` (every account)
 *  - `GET /users/admin/{id}` → one `UserResponse`
 *  - `PUT /users/admin/{id}/enabled` `{ enabled }` — switch an account on or off
 *  - `PUT /users/admin/{id}/role` `{ role }` — give an account a role
 *  - `DELETE /users/admin/{id}` — remove an account
 */

const KEY = ['admin', 'users'];

export function useAdminUsers() {
  return useQuery({ queryKey: KEY, queryFn: () => apiGet('/users/admin') });
}

export function useAdminUser(id) {
  return useQuery({ queryKey: [...KEY, id], queryFn: () => apiGet(`/users/admin/${id}`), enabled: !!id });
}

/** Runs one of the mutations below and refreshes the user list and that user's page afterwards. */
function useUserMutation(mutationFn, success, failure) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: KEY });
      toast.success(typeof success === 'function' ? success(variables) : success);
    },
    onError: (error) => toast.error(apiErrorMessage(error, failure)),
  });
}

/** Switches an account on or off. Pass `{ id, enabled }`. */
export function useSetUserEnabled() {
  return useUserMutation(
    ({ id, enabled }) => apiPut(`/users/admin/${id}/enabled`, { enabled }),
    ({ enabled }) => (enabled ? 'Account enabled.' : 'Account disabled.'),
    "Couldn't change that account."
  );
}

/** Gives an account a role. Pass `{ id, role }`. */
export function useSetUserRole() {
  return useUserMutation(({ id, role }) => apiPut(`/users/admin/${id}/role`, { role }), 'Role updated.', "Couldn't change that role.");
}

/** Removes an account. Pass its id. */
export function useDeleteUser() {
  return useUserMutation((id) => apiDelete(`/users/admin/${id}`), 'Account deleted.', "Couldn't delete that account.");
}
