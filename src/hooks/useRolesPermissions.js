import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';

/**
 * Roles and permissions — the `/roles` and `/permissions` endpoints of the live spec:
 *  - `GET /roles` → `RoleResponse[]` (`id`, `roleName`, `description`, `permissions` as names, `createdAt`, `updatedAt`)
 *  - `POST /roles` `{ roleName, description?, permissions? }`
 *  - `GET|PUT|DELETE /roles/{idOrName}` — `PUT` takes `{ description?, permissions? }` (the role's whole permission set)
 *  - `GET /permissions` → `PermissionResponse[]` (`id`, `permissionName`, `description`, …)
 *  - `POST /permissions` `{ permissionName, description? }`, `PUT|DELETE /permissions/{idOrName}`
 * A person gets their permissions from their roles (the login token carries them); giving a person a role is `PUT /users/admin/{id}/role`.
 */

const ROLES = ['roles'];
const PERMISSIONS = ['permissions'];

export const useRoles = () => useQuery({ queryKey: ROLES, queryFn: () => apiGet('/roles') });
export const usePermissions = () => useQuery({ queryKey: PERMISSIONS, queryFn: () => apiGet('/permissions') });

/** A mutation that refreshes roles, permissions and the account list (which shows each person's permissions) afterwards. */
function useChange(mutationFn, success, failure) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ROLES });
      queryClient.invalidateQueries({ queryKey: PERMISSIONS });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success(typeof success === 'function' ? success(variables) : success);
    },
    onError: (error) => toast.error(apiErrorMessage(error, failure)),
  });
}

/** Adds a role. Pass `{ roleName, description?, permissions? }`. */
export const useCreateRole = () => useChange((body) => apiPost('/roles', body), ({ roleName }) => `Role ${roleName} created.`, "Couldn't create that role.");

/** Changes a role's description and/or its permissions. Pass `{ role, description?, permissions? }` — `role` is its name or id. */
export const useUpdateRole = () =>
  useChange(({ role, ...body }) => apiPut(`/roles/${encodeURIComponent(role)}`, body), ({ role }) => `Role ${role} saved.`, "Couldn't save that role.");

/** Removes a role. Pass its name or id. */
export const useDeleteRole = () => useChange((role) => apiDelete(`/roles/${encodeURIComponent(role)}`), (role) => `Role ${role} deleted.`, "Couldn't delete that role.");

/** Adds a permission. Pass `{ permissionName, description? }`. */
export const useCreatePermission = () =>
  useChange((body) => apiPost('/permissions', body), ({ permissionName }) => `Permission ${permissionName} created.`, "Couldn't create that permission.");

/** Renames or re-describes a permission. Pass `{ permission, permissionName, description? }` — `permission` is its current name or id. */
export const useUpdatePermission = () =>
  useChange(
    ({ permission, ...body }) => apiPut(`/permissions/${encodeURIComponent(permission)}`, body),
    ({ permissionName }) => `Permission ${permissionName} saved.`,
    "Couldn't save that permission."
  );

/** Removes a permission. Pass its name or id. */
export const useDeletePermission = () =>
  useChange((permission) => apiDelete(`/permissions/${encodeURIComponent(permission)}`), (permission) => `Permission ${permission} deleted.`, "Couldn't delete that permission.");
