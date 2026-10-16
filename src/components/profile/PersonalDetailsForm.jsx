import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { phoneField } from '../../lib/phone';
import PhoneVerification from './PhoneVerification';
import toast from 'react-hot-toast';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorBanner from '../ui/ErrorBanner';
import { useCurrentUser, useUpdateProfile } from '../../hooks/useProfile';
import DraftNotice from '../ui/DraftNotice';
import { useFormDraft } from '../../hooks/useFormDraft';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { CONTACT_KINDS } from '../../lib/cart';
import { apiErrorMessage } from '../../lib/apiError';

/**
 * Personal details — `ProfileRequest`, saved with `PATCH /users/me` and NOTHING
 * else (the owner/business/payout details are a different endpoint, see
 * OwnerProfileForm). Limits are from the live OpenAPI spec: firstName ≤100,
 * middleName ≤100, lastName ≤100, phoneNumber ≤30, location ≤255. The spec marks
 * nothing required; the phone number is mandatory by the user's own product
 * rule. The ID number is shown but not editable: it's read off the identity document's photo when it's
 * uploaded (see `useIdentityCapture`), so it can't be typed in here. (The spec's idNumberUrlFront / idNumberUrlBack / drivingLicenseFrontUrl /
 * drivingLicenseBackUrl / profilePhotoUrl take links that nothing in the API gives a
 * user, so they aren't offered.)
 * Used by every role — a renter's whole profile is this form.
 */
const limited = (max, label) => z.string().trim().max(max, `${label} must be ${max} characters or fewer`);

const schema = z.object({
  firstName: limited(100, 'First name'),
  middleName: limited(100, 'Middle name'),
  lastName: limited(100, 'Last name'),
  phoneNumber: phoneField,
  location: limited(255, 'Location'),
});

const FIELDS = ['firstName', 'middleName', 'lastName', 'phoneNumber', 'location'];

const baseValues = (user) => ({
  firstName: user?.firstName || '',
  middleName: user?.middleName || '',
  lastName: user?.lastName || '',
  phoneNumber: user?.phoneNumber || '',
  location: user?.location || '',
});

/**
 * @param {function} [onSaved] — called with the updated `UserResponse`
 * @param {string} [submitLabel]
 */
export default function PersonalDetailsForm({ onSaved, submitLabel = 'Save Personal Details' }) {
  const { data: currentUser } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors, dirtyFields, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', middleName: '', lastName: '', phoneNumber: '', location: '' },
  });

  useEffect(() => {
    if (!currentUser) return;
    // keepDirtyValues: a refetch must not wipe what the person is in the middle of typing (or a restored draft).
    reset(baseValues(currentUser), { keepDirtyValues: true });
  }, [currentUser, reset]);

  // Someone who shared a phone number while choosing a vehicle (before they had an account) gets it filled in
  // here, ready to save, if their profile has none yet.
  const sharedPhone = useCartStore((s) => (s.contact?.kind === CONTACT_KINDS.PHONE ? s.contact.value : ''));
  useEffect(() => {
    if (!currentUser || currentUser.phoneNumber || !sharedPhone) return;
    if (!getValues('phoneNumber')) setValue('phoneNumber', sharedPhone, { shouldDirty: true });
  }, [currentUser, sharedPhone, getValues, setValue]);

  // Unsaved input survives a reload (per user); dropped once saved.
  const userId = useAuthStore((s) => s.user?.id);
  const { restored, discard } = useFormDraft({
    key: userId ? `personal.${userId}` : null,
    watch,
    getValues,
    setValue,
    isDirty,
    ready: !!currentUser,
    resetToBase: () => reset(baseValues(currentUser)),
  });

  function onSubmit(values) {
    // ProfileRequest has no required fields, so only what changed is sent
    // (an emptied field is sent as "" to clear it).
    const changed = FIELDS.filter((f) => dirtyFields[f]);
    if (changed.length === 0) {
      toast('Already saved — nothing new here to submit.', { icon: 'ℹ️' });
      onSaved?.(currentUser);
      return;
    }
    updateProfile.mutate(Object.fromEntries(changed.map((f) => [f, String(values[f] ?? '').trim()])), {
      onSuccess: (user) => {
        // Show exactly what was saved (e.g. the phone in its standard +254… form), so nothing looks unsaved.
        if (user) reset(baseValues(user));
        onSaved?.(user);
      },
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {restored && <DraftNotice onDiscard={discard} />}

      {updateProfile.isError && (
        <ErrorBanner message={apiErrorMessage(updateProfile.error, 'Could not save your personal details.')} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input label="First Name" autoComplete="given-name" error={errors.firstName?.message} register={register('firstName')} />
        <Input label="Middle Name" autoComplete="additional-name" error={errors.middleName?.message} register={register('middleName')} />
        <Input label="Last Name" autoComplete="family-name" error={errors.lastName?.message} register={register('lastName')} />
      </div>
      <Input label="Email" type="email" value={currentUser?.email || ''} disabled readOnly hint="Contact support to change your email." />
      <Input label="Phone" required type="tel" autoComplete="tel" error={errors.phoneNumber?.message} register={register('phoneNumber')} />
      <PhoneVerification phoneNumber={currentUser?.phoneNumber} verified={currentUser?.phoneVerified === true} />
      <Input label="Location" autoComplete="address-level2" error={errors.location?.message} register={register('location')} />
      <Input
        label="ID Number"
        value={currentUser?.idNumber || ''}
        disabled
        readOnly
        hint="Read from your National ID or Passport when you upload it under Documents."
      />

      <Button type="submit" size="lg" loading={updateProfile.isPending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
