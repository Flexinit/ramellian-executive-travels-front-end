import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorBanner from '../ui/ErrorBanner';
import { useCurrentUser, useUpdateOwnerProfile } from '../../hooks/useProfile';
import DraftNotice from '../ui/DraftNotice';
import { useFormDraft } from '../../hooks/useFormDraft';
import { useAuthStore } from '../../store/authStore';
import { apiErrorMessage } from '../../lib/apiError';
import { ACCOUNT_TYPES } from '../../lib/constants';

/**
 * Car-owner account details — `OwnerProfileRequest`, saved with
 * `PUT /users/me/owner-profile` and NOTHING else (name/phone/location/ID
 * number are a different endpoint, see PersonalDetailsForm). Only shown to
 * car owners. Limits are from the live OpenAPI spec: ownerType ≤50,
 * businessName ≤255, businessRegistrationNumber ≤100, businessTaxNumber ≤100,
 * businessAddress ≤255, payoutProvider ≤100, payoutAccountReference ≤100. The
 * spec marks nothing required. Saving it is what marks the profile complete
 * (`hasCompletedProfile`), confirmed live.
 */
const limited = (max, label) => z.string().trim().max(max, `${label} must be ${max} characters or fewer`);

const schema = z.object({
  accountType: z.enum([ACCOUNT_TYPES.INDIVIDUAL, ACCOUNT_TYPES.BUSINESS]),
  businessName: limited(255, 'Business name'),
  businessRegistrationNumber: limited(100, 'Registration number'),
  businessTaxNumber: limited(100, 'Tax number'),
  businessAddress: limited(255, 'Business address'),
  payoutProvider: limited(100, 'Payout provider'),
  payoutAccountReference: limited(100, 'Payout account reference'),
});

const FIELDS = ['accountType', 'businessName', 'businessRegistrationNumber', 'businessTaxNumber', 'businessAddress', 'payoutProvider', 'payoutAccountReference'];

const baseValues = (user) => ({
  accountType: user?.ownerType || ACCOUNT_TYPES.INDIVIDUAL,
  businessName: user?.businessName || '',
  businessRegistrationNumber: user?.businessRegistrationNumber || '',
  businessTaxNumber: user?.businessTaxNumber || '',
  businessAddress: user?.businessAddress || '',
  payoutProvider: user?.payoutProvider || '',
  payoutAccountReference: '',
});

const ACCOUNT_TYPE_OPTIONS = [
  { value: ACCOUNT_TYPES.INDIVIDUAL, label: 'Individual', hint: 'You, as a person' },
  { value: ACCOUNT_TYPES.BUSINESS, label: 'Business', hint: 'Registered or not — a limited company isn’t required' },
];

/** Drops empty strings so optional fields are omitted rather than sent blank. */
function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => typeof v === 'string' && v.trim() !== '').map(([k, v]) => [k, v.trim()]));
}

/**
 * @param {function} [onSaved] — called with the updated `UserResponse`
 * @param {string} [submitLabel]
 */
export default function OwnerProfileForm({ onSaved, submitLabel = 'Save Account Details' }) {
  const { data: currentUser } = useCurrentUser();
  const updateOwnerProfile = useUpdateOwnerProfile();
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
    defaultValues: {
      accountType: ACCOUNT_TYPES.INDIVIDUAL,
      businessName: '',
      businessRegistrationNumber: '',
      businessTaxNumber: '',
      businessAddress: '',
      payoutProvider: '',
      payoutAccountReference: '',
    },
  });
  const accountType = watch('accountType');

  useEffect(() => {
    if (!currentUser) return;
    // keepDirtyValues: a refetch must not wipe what the person is in the middle of typing (or a restored draft).
    reset(baseValues(currentUser), { keepDirtyValues: true });
  }, [currentUser, reset]);

  // Unsaved input survives a reload (per user); dropped once saved.
  const userId = useAuthStore((s) => s.user?.id);
  const { restored, discard } = useFormDraft({
    key: userId ? `owner.${userId}` : null,
    watch,
    getValues,
    setValue,
    isDirty,
    ready: !!currentUser,
    resetToBase: () => reset(baseValues(currentUser)),
  });

  function onSubmit(values) {
    // Nothing to send if the account type is already saved and nothing changed.
    if (currentUser?.ownerType && !FIELDS.some((f) => dirtyFields[f])) {
      toast('Already saved — nothing new here to submit.', { icon: 'ℹ️' });
      onSaved?.(currentUser);
      return;
    }
    const payload = {
      ownerType: values.accountType,
      ...compact({
        ...(values.accountType === ACCOUNT_TYPES.BUSINESS
          ? {
              businessName: values.businessName,
              businessRegistrationNumber: values.businessRegistrationNumber,
              businessTaxNumber: values.businessTaxNumber,
              businessAddress: values.businessAddress,
            }
          : {}),
        payoutProvider: values.payoutProvider,
        payoutAccountReference: values.payoutAccountReference,
      }),
    };
    updateOwnerProfile.mutate(payload, {
      onSuccess: (user) => onSaved?.(user),
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {restored && <DraftNotice onDiscard={discard} />}

      {updateOwnerProfile.isError && (
        <ErrorBanner message={apiErrorMessage(updateOwnerProfile.error, 'Could not save your account details.')} />
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-ink mb-1">Account type</legend>
        <div className="grid grid-cols-2 gap-3">
          {ACCOUNT_TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex flex-col gap-0.5 rounded-xl border px-4 py-3 cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent ${
                accountType === opt.value ? 'border-accent bg-accent/10' : 'border-ink/10 bg-ink/5 hover:border-accent/40'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input type="radio" value={opt.value} className="accent-accent" {...register('accountType')} />
                {opt.label}
              </span>
              <span className="text-xs text-muted pl-6">{opt.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {accountType === ACCOUNT_TYPES.BUSINESS && (
        <div className="flex flex-col gap-4">
          <Input label="Business Name" autoComplete="organization" error={errors.businessName?.message} register={register('businessName')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Registration Number (if registered)" error={errors.businessRegistrationNumber?.message} register={register('businessRegistrationNumber')} />
            <Input label="Tax Number / KRA PIN (if you have one)" error={errors.businessTaxNumber?.message} register={register('businessTaxNumber')} />
          </div>
          <Input label="Business Address" error={errors.businessAddress?.message} register={register('businessAddress')} />
        </div>
      )}

      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-ink">
          Payouts <span className="text-muted font-normal">(where your earnings are sent)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Payout Provider" placeholder="e.g. MPESA" error={errors.payoutProvider?.message} register={register('payoutProvider')} />
          <Input
            label="Payout Account Reference"
            placeholder="Phone or account number"
            error={errors.payoutAccountReference?.message}
            register={register('payoutAccountReference')}
          />
        </div>
      </div>

      <Button type="submit" size="lg" loading={updateOwnerProfile.isPending} className="self-start">
        {submitLabel}
      </Button>
    </form>
  );
}
