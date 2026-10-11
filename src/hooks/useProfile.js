import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiGet, apiPatch, apiPut } from '../lib/api';
import { apiErrorMessage } from '../lib/apiError';
import { missingRequiredDocuments } from '../lib/documents';
import { useDocuments } from './useDocuments';
import { useAuthStore } from '../store/authStore';

export { apiErrorMessage };

/**
 * Profile queries/mutations — confirmed against the live OpenAPI spec
 * (`/v3/api-docs`) and the live backend:
 *  - `GET /users/me` → `UserResponse` (id, email, firstName, lastName,
 *    roles, ownerType, business fields, payout fields, phoneNumber,
 *    location, and the completion flags `hasCompletedProfile`,
 *    `hasAddedVehicleToProfile`, `isCarOwner`, …).
 *  - `PATCH /users/me` (not PUT) takes a `ProfileRequest`
 *    (firstName, lastName required; phoneNumber, location optional).
 *    As of the last live test it answers 500 for valid input — a backend
 *    fault; callers must surface the failure rather than assume success.
 *  - `PUT /users/me/owner-profile` takes an `OwnerProfileRequest`
 *    (ownerType required; businessName, businessRegistrationNumber,
 *    businessTaxNumber, businessAddress, payoutProvider,
 *    payoutAccountReference optional). Confirmed live: saving it is what
 *    flips `hasCompletedProfile` to true — i.e. "profile complete" means
 *    the account type (and, for a business, its details) has been chosen.
 */

/**
 * Fetches the signed-in user's full profile. Only enabled once
 * authenticated — `authStore.user` already has `id`/`email`/`roles` from
 * the access token's own claims (see authStore.js), so route guards don't
 * need to wait on this; it fills in the richer fields (name, owner/business
 * info) a moment later.
 */
export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => apiGet('/users/me'),
    enabled: isAuthenticated,
  });
}

/**
 * Fetches `GET /users/me` once authenticated and merges the result into
 * `authStore.user`, so the richer profile (name, owner/business info) is
 * available app-wide a moment after login/2FA, on whichever page the user
 * happens to land on. Mount once near the app root (see App.jsx's
 * RootLayout) — every other consumer should just read `authStore.user`
 * rather than calling this again.
 */
export function useSyncCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser);
  const { data } = useCurrentUser();

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);
}

/**
 * Which "finish setting up" steps apply to the signed-in user, in the order
 * they should be tackled:
 *  1. profile — for a car owner, no account type saved yet (`ownerType` empty:
 *     choose Individual/Business); for anyone, a still-empty phone number
 *     (the one mandatory profile field);
 *  2. documents — once the account type is chosen, a missing identity document
 *     (the one required upload; business documents are optional);
 *  3. vehicle — car owners only, `hasAddedVehicleToProfile === false`.
 * The flag checks are `=== false` on purpose: until `GET /users/me` has
 * resolved they're `undefined`, and that must not flash a prompt at someone
 * who has actually finished. `isCarOwner` isn't trusted on its own (the live
 * backend returned it as false for an account whose role was CAR_OWNER), so
 * the Owner role counts too.
 */
export function useSetupPrompts() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const isOwner = !!user && (user.isCarOwner === true || (user.roles || []).includes('OWNER'));
  // The account type is what the owner-profile step asks for, so it counts as done once `ownerType` is
  // saved. The backend's own `hasCompletedProfile` flag is NOT used: tested live, it stayed false after the
  // account type had saved (`ownerType: INDIVIDUAL`), which made the portal ask again and again. A renter
  // has no owner profile, so isn't asked; they are only nagged by the phone number below.
  const needsProfile = isAuthenticated && isOwner && user?.hasCompletedProfile !== undefined && !String(user?.ownerType ?? '').trim();
  // The phone number is mandatory (a product rule, though the spec doesn't require it). Only judged once
  // `GET /users/me` has landed — the completion flag being defined marks that — so an unloaded profile
  // isn't reported as missing a phone.
  const needsPhone = isAuthenticated && user?.hasCompletedProfile !== undefined && !String(user?.phoneNumber ?? '').trim();

  const needsVehicle = isAuthenticated && isOwner && user?.hasAddedVehicleToProfile === false;

  const documentsEnabled = isAuthenticated && user?.hasCompletedProfile !== undefined && !needsProfile;
  const { data: documents, isError: documentsFailed } = useDocuments({ enabled: documentsEnabled });
  // False while the documents check is still in flight, so callers can wait before picking a starting step.
  const documentsReady = !documentsEnabled || documents !== undefined || documentsFailed;
  const missingDocuments = documents ? missingRequiredDocuments(documents) : [];
  const needsDocuments = missingDocuments.length > 0;

  // `GET /users/me` has landed (the completion flag is defined — its value isn't used), so the flags can be trusted.
  const profileLoaded = isAuthenticated && user?.hasCompletedProfile !== undefined;

  return {
    isOwner,
    profileLoaded,
    needsProfile,
    needsPhone,
    needsDocuments,
    documentsReady,
    missingDocuments,
    needsVehicle,
    profilePath: '/dashboard/profile',
    documentsPath: '/dashboard/documents',
    vehiclePath: '/owner/vehicles/new',
  };
}

function applyUser(queryClient, setUser, data) {
  setUser(data);
  queryClient.setQueryData(['users', 'me'], data);
}

/** Updates the signed-in user's name/phone/location. */
export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => apiPatch('/users/me', payload),
    onSuccess: (data) => {
      applyUser(queryClient, setUser, data);
      toast.success('Profile updated.');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not save your profile.'));
    },
  });
}

/** Updates the signed-in owner's business/payout details. */
export function useUpdateOwnerProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => apiPut('/users/me/owner-profile', payload),
    onSuccess: (data) => {
      applyUser(queryClient, setUser, data);
      toast.success('Owner profile updated.');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, 'Could not save your owner profile.'));
    },
  });
}
