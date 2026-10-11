import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiPut } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { useAuthStore } from '../store/authStore';

/**
 * Account security for the signed-in person:
 *  - `PUT /users/me/password` `{ currentPassword, newPassword }` (new password 8–72 characters) — answers with no body
 *  - `PUT /users/me/2fa` `{ enabled?, method }` (`method` is `EMAIL` or `WHATSAPP`) → the updated `UserResponse`
 */

/** Changes the password. Pass `{ currentPassword, newPassword }`. */
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload) => apiPut('/users/me/password', payload),
    onSuccess: () => toast.success('Password changed.'),
    // A wrong current password is shown on the form itself by the caller, so nothing is toasted for a 400/401/403 here.
    onError: (error) => {
      const status = error?.response?.status;
      if (![400, 401, 403, 422].includes(status)) toast.error(apiErrorMessage(error, "Couldn't change your password."));
    },
  });
}

/** Turns two-factor sign-in on or off, and picks how the code is sent. Pass `{ enabled, method }`. */
export function useSetTwoFactor() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: ({ enabled, method }) => apiPut('/users/me/2fa', { enabled, method }),
    onSuccess: (updated, { enabled }) => {
      if (updated) setUser(updated);
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      toast.success(enabled ? 'Two-factor sign-in is on.' : 'Two-factor sign-in is off.');
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Couldn't change two-factor sign-in.")),
  });
}
