import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { newPasswordField } from '../lib/password';
import PasswordChecklist from '../components/auth/PasswordChecklist';
import { phoneField } from '../lib/phone';
import Input from '../components/ui/Input';
import RememberMe from '../components/auth/RememberMe';
import Checkbox from '../components/ui/Checkbox';
import Button from '../components/ui/Button';
import PageTitle from '../components/layout/PageTitle';
import Divider from '../components/ui/Divider';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { useGoogleLogin, useRegister, WHATSAPP_CHANNEL } from '../hooks/useAuth';
import SegmentedControl from '../components/ui/SegmentedControl';
import { isGoogleSignInEnabled, isWhatsAppVerificationEnabled } from '../lib/features';
import { rememberOwnerIntent } from '../lib/landing';
import { clearDraft } from '../lib/formDraft';
import { useCartStore } from '../store/cartStore';
import { CONTACT_KINDS } from '../lib/cart';
import { useFormDraft } from '../hooks/useFormDraft';
import DraftNotice from '../components/ui/DraftNotice';
import AuthBackdrop from '../components/layout/AuthBackdrop';
import AuthCard from '../components/auth/AuthCard';
import { AUTH_PHOTOS } from '../lib/authPhotos';

/**
 * The payload matches the backend's `RegisterRequest` exactly (confirmed
 * against the live OpenAPI spec): `email`, `password`, `firstName`,
 * `lastName`, and — when the person wants the code on WhatsApp — `phoneNumber` and
 * `verificationChannel: 'WHATSAPP'`. Whether the account is an Individual or a Business is NOT asked
 * here: it only exists on the owner profile and is chosen in the profile's
 * account-details step.
 */
const schema = z
  .object({
    firstName: z.string().min(1, 'Enter your first name'),
    lastName: z.string().min(1, 'Enter your last name'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    // How the verification code is delivered: by email (the default) or on WhatsApp.
    verifyVia: z.enum(['EMAIL', WHATSAPP_CHANNEL]),
    // Always asked (the phone number is mandatory — product rule). Sent as `RegisterRequest.phoneNumber` only
    // when the code goes to WhatsApp; otherwise saved to the profile right after sign-in (useAuth.js).
    phoneNumber: phoneField,
    password: newPasswordField,
    confirmPassword: z.string().min(1, 'Confirm your password'),
    // Client-side only — `RegisterRequest` has no field for this (confirmed against the live OpenAPI
    // spec), so it's never sent to the backend, just required before the form can submit at all.
    agreeToTerms: z.literal(true, { errorMap: () => ({ message: 'Required to create an account' }) }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });



export default function RegisterPage() {
  // "List Your Car" arrives here as `?as=owner`; remember it so the first login opens the Owner Panel's setup steps.
  const [searchParams] = useSearchParams();
  const wantsToRentOut = searchParams.get('as') === 'owner';
  useEffect(() => {
    if (wantsToRentOut) rememberOwnerIntent();
  }, [wantsToRentOut]);

  // Someone who came here from checkout has a saved selection; the email they shared there starts the form.
  const hasSelection = useCartStore((s) => s.items.length > 0);
  const sharedEmail = useCartStore((s) => (s.contact?.kind === CONTACT_KINDS.EMAIL ? s.contact.value : ''));

  const {
    register,
    handleSubmit,
    watch,
    reset,
    getValues,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    // Every field has a default, so an emptied form reads as pristine (not "dirty") and drafts clear properly.
    defaultValues: { firstName: '', lastName: '', email: sharedEmail, verifyVia: 'EMAIL', phoneNumber: '', password: '', confirmPassword: '', agreeToTerms: false },
  });
  // Name and email survive a reload; the passwords are never stored, and agreeing to the Terms isn't
  // either — it's asked again each time, rather than restored as already checked.
  const { restored, discard } = useFormDraft({
    key: 'register',
    watch,
    getValues,
    setValue,
    isDirty,
    exclude: ['password', 'confirmPassword', 'agreeToTerms'],
    resetToBase: () => reset(),
  });
  const registerUser = useRegister();
  const googleLogin = useGoogleLogin('register');
  const password = watch('password', '');
  // WhatsApp verification is switched off for now (lib/features.js): everyone verifies by email.
  const whatsappOffered = isWhatsAppVerificationEnabled();
  const verifyVia = whatsappOffered ? watch('verifyVia') : 'EMAIL';

  function onSubmit(values) {
    const { confirmPassword, agreeToTerms, verifyVia: via, phoneNumber, ...rest } = values;
    // The phone number and channel are only sent when the code is to go to WhatsApp.
    const payload = via === WHATSAPP_CHANNEL ? { ...rest, phoneNumber, verificationChannel: WHATSAPP_CHANNEL } : rest;
    registerUser.mutate({ ...payload, profilePhone: phoneNumber }, {
      onSuccess: () => clearDraft('register'),
      onError: (error) => {
        const fieldErrors = error?.response?.data?.fieldErrors;
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) => {
            setError(field, { type: 'server', message: Array.isArray(message) ? message[0] : message });
          });
        }
      },
    });
  }

  return (
    <AuthBackdrop images={AUTH_PHOTOS} title="Travel in style, wherever you're going" subtitle="Create your account to book chauffeured or self-drive cars — or to list your own.">
      <PageTitle title="Create Account" />
      <div className="w-full">

        <AuthCard>
          <div className="text-center">
            <h1 className="font-heading text-ink text-2xl font-bold">Create your account</h1>
            <p className="text-muted text-sm mt-1.5">
              {hasSelection ? 'Your booking is saved — create your account to continue with it.' : 'Book chauffeured or self-drive vehicles in minutes.'}
            </p>
          </div>

          {(isGoogleSignInEnabled() || import.meta.env.DEV) && (
            <>
              <GoogleSignInButton text="signup_with" onCredential={googleLogin.mutate} disabled={googleLogin.isPending || registerUser.isPending} />
              <Divider label="or sign up with your email" />
            </>
          )}

          {restored && <DraftNotice onDiscard={discard} note="For your security, passwords aren't kept." />}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                autoComplete="given-name"
                error={errors.firstName?.message}
                register={register('firstName')}
              />
              <Input
                label="Last Name"
                autoComplete="family-name"
                error={errors.lastName?.message}
                register={register('lastName')}
              />
            </div>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              register={register('email')}
            />

            {whatsappOffered && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Send my verification code by</span>
              <SegmentedControl
                label="Send my verification code by"
                size="sm"
                options={[
                  { value: 'EMAIL', label: 'Email' },
                  { value: WHATSAPP_CHANNEL, label: 'WhatsApp' },
                ]}
                value={verifyVia}
                onChange={(value) => setValue('verifyVia', value, { shouldValidate: true, shouldDirty: true })}
              />
            </div>
            )}

            <Input
              label={verifyVia === WHATSAPP_CHANNEL ? 'WhatsApp number' : 'Phone number'}
              type="tel"
              autoComplete="tel"
              required
              hint={verifyVia === WHATSAPP_CHANNEL ? 'The number on WhatsApp, e.g. 0712 345 678 or +254 712 345 678.' : 'e.g. 0712 345 678. Never shown to vehicle owners.'}
              error={errors.phoneNumber?.message}
              register={register('phoneNumber')}
            />

            <div className="flex flex-col gap-1.5">
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                error={errors.password?.message}
                register={register('password')}
              />
              <PasswordChecklist password={password} />
            </div>

            <Input
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              register={register('confirmPassword')}
            />

            <RememberMe />
            <Checkbox
              register={register('agreeToTerms')}
              error={errors.agreeToTerms?.message}
              label={
                <>
                  I agree to the{' '}
                  <Link to="/terms" target="_blank" className="text-accent hover:text-accent-hover underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" target="_blank" className="text-accent hover:text-accent-hover underline">
                    Privacy Policy
                  </Link>
                </>
              }
            />

            <Button type="submit" size="lg" loading={registerUser.isPending} className="mt-2">
              Create Account
            </Button>
          </form>

          <p className="pt-5 border-t border-ink/10 text-center text-muted text-sm">
            Already have an account?{' '}
            <Link to="/auth/login" className="text-accent hover:text-accent-hover font-semibold focus-ring rounded-md">
              Log in
            </Link>
          </p>
        </AuthCard>
      </div>
    </AuthBackdrop>
  );
}
