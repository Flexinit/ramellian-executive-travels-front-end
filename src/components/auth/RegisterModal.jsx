import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../ui/Input';
import Checkbox from '../ui/Checkbox';
import Button from '../ui/Button';
import Drawer from '../ui/Drawer';
import Divider from '../ui/Divider';
import SegmentedControl from '../ui/SegmentedControl';
import GoogleSignInButton from './GoogleSignInButton';
import { useGoogleLogin, useRegister, WHATSAPP_CHANNEL } from '../../hooks/useAuth';
import { isGoogleSignInEnabled, isWhatsAppVerificationEnabled } from '../../lib/features';
import { useCartStore } from '../../store/cartStore';
import { CONTACT_KINDS } from '../../lib/cart';

/** Same schema as RegisterPage — see that file's own note on why account type isn't asked here. */
const schema = z
  .object({
    firstName: z.string().min(1, 'Enter your first name'),
    lastName: z.string().min(1, 'Enter your last name'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    verifyVia: z.enum(['EMAIL', WHATSAPP_CHANNEL]),
    phoneNumber: z.string().trim().max(30, 'Phone number must be 30 characters or fewer'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
    // Client-side only — see RegisterPage's own copy of this field for why it's never sent to the backend.
    agreeToTerms: z.literal(true, { errorMap: () => ({ message: 'Required to create an account' }) }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.verifyVia !== WHATSAPP_CHANNEL || data.phoneNumber.length > 0, {
    message: 'Enter your WhatsApp number',
    path: ['phoneNumber'],
  });

function passwordStrength(password = '') {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const STRENGTH_LABELS = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-brand-gold', 'bg-emerald-500'];

/**
 * The same registration form as RegisterPage, offered as a right-side drawer — same reasoning as LoginModal,
 * but more directly relevant here: a guest reaching checkout is far more often a brand-new visitor than someone
 * with an existing account, so this is the drawer that actually matters most for "don't make it feel like
 * leaving the booking" — it slides in over a dimmed-but-visible page rather than covering it like a centered
 * popup would. It can only go so far, though — `useRegister` still navigates to the real `/auth/verify-email`
 * page once the account is created (there's a code to type in, which needs its own screen no matter how the
 * form itself was presented); this drawer removes the page transition for *typing in your details*, not the
 * one unavoidable step after it.
 *
 * @param {boolean} isOpen @param {function} onClose
 * @param {function} [onReopen] — forwarded to `Drawer`'s restore tab, shown after this is dismissed
 * @param {function} [onSwitchToLogin] — "Log in instead" — if omitted, falls back to a real link to the full
 *   `/auth/login` page (e.g. if this is ever used somewhere without a matching LoginModal alongside it)
 */
export default function RegisterModal({ isOpen, onClose, onReopen, onSwitchToLogin }) {
  const hasSelection = useCartStore((s) => s.items.length > 0);
  const sharedEmail = useCartStore((s) => (s.contact?.kind === CONTACT_KINDS.EMAIL ? s.contact.value : ''));

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: sharedEmail, verifyVia: 'EMAIL', phoneNumber: '', password: '', confirmPassword: '', agreeToTerms: false },
  });
  const registerUser = useRegister();
  const googleLogin = useGoogleLogin('register');
  const password = watch('password', '');
  const whatsappOffered = isWhatsAppVerificationEnabled();
  const verifyVia = whatsappOffered ? watch('verifyVia') : 'EMAIL';
  const strength = passwordStrength(password);

  // The email shared on the "How can we reach you?" step can arrive after this form already mounted (it's
  // its own page, visited before checkout) — keeps the field in sync rather than only seeding it once at mount.
  useEffect(() => {
    if (sharedEmail) setValue('email', sharedEmail);
  }, [sharedEmail, setValue]);

  function onSubmit(values) {
    const { confirmPassword, agreeToTerms, verifyVia: via, phoneNumber, ...rest } = values;
    const payload = via === WHATSAPP_CHANNEL ? { ...rest, phoneNumber, verificationChannel: WHATSAPP_CHANNEL } : rest;
    registerUser.mutate(payload, {
      onError: (error) => {
        const fieldErrors = error?.response?.data?.fieldErrors;
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([field, message]) => {
            setError(field, { type: 'server', message: Array.isArray(message) ? message[0] : message });
          });
        }
      },
    });
    // `useRegister`'s own onSuccess navigates to /auth/verify-email, which unmounts whatever page this modal
    // was open over — nothing further to do here on success.
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Drawer isOpen={isOpen} onClose={handleClose} onReopen={onReopen} title="Create Account" size="md">
      <div className="flex flex-col gap-5">
        <p className="text-brand-grey text-sm -mt-2">
          {hasSelection ? 'Your booking is saved — create your account to continue with it.' : 'Book chauffeured or self-drive vehicles in minutes.'}
        </p>

        {(isGoogleSignInEnabled() || import.meta.env.DEV) && (
          <>
            <GoogleSignInButton text="signup_with" onCredential={googleLogin.mutate} disabled={googleLogin.isPending || registerUser.isPending} />
            <Divider label="or sign up with your email" />
          </>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" autoComplete="given-name" error={errors.firstName?.message} register={register('firstName')} />
            <Input label="Last Name" autoComplete="family-name" error={errors.lastName?.message} register={register('lastName')} />
          </div>
          <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} register={register('email')} />

          {whatsappOffered && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-brand-white">Send my verification code by</span>
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

          {verifyVia === WHATSAPP_CHANNEL && (
            <Input
              label="WhatsApp number"
              type="tel"
              autoComplete="tel"
              required
              hint="The number on WhatsApp, e.g. 0712 345 678 or +254 712 345 678."
              error={errors.phoneNumber?.message}
              register={register('phoneNumber')}
            />
          )}

          {/* Side by side (like First/Last Name), so the whole form fits in the panel without scrolling. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <div className="flex flex-col gap-1.5">
              <Input label="Password" type="password" autoComplete="new-password" error={errors.password?.message} register={register('password')} />
              {password && (
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strength ? STRENGTH_COLORS[strength] : 'bg-white/10'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-brand-grey">
                    Strength: <span className="text-brand-white font-medium">{STRENGTH_LABELS[strength]}</span>
                  </span>
                </div>
              )}
            </div>

            <Input
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              register={register('confirmPassword')}
            />
          </div>

          <Checkbox
            register={register('agreeToTerms')}
            error={errors.agreeToTerms?.message}
            label={
              <>
                I agree to the{' '}
                <Link to="/terms" target="_blank" className="text-brand-gold hover:text-brand-gold-light underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" target="_blank" className="text-brand-gold hover:text-brand-gold-light underline">
                  Privacy Policy
                </Link>
              </>
            }
          />

          <Button type="submit" size="lg" loading={registerUser.isPending} className="mt-1">
            Create Account
          </Button>
        </form>

        <p className="text-center text-brand-grey text-sm">
          Already have an account?{' '}
          {onSwitchToLogin ? (
            <button
              type="button"
              onClick={() => {
                reset();
                onSwitchToLogin();
              }}
              className="text-brand-gold hover:text-brand-gold-light font-semibold focus-ring rounded-md"
            >
              Log in
            </button>
          ) : (
            <Link
              to="/auth/login"
              onClick={handleClose}
              className="text-brand-gold hover:text-brand-gold-light font-semibold focus-ring rounded-md"
            >
              Log in
            </Link>
          )}
        </p>
      </div>
    </Drawer>
  );
}
