import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { MailCheck } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import PageTitle from '../components/layout/PageTitle';
import AuthBackdrop from '../components/layout/AuthBackdrop';
import AuthCard from '../components/auth/AuthCard';
import PasswordChecklist from '../components/auth/PasswordChecklist';
import { useForgotPassword, useResetPassword } from '../hooks/useAuth';
import { newPasswordField } from '../lib/password';
import { AUTH_PHOTOS } from '../lib/authPhotos';

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
});

const resetSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from the email'),
    newPassword: newPasswordField,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: "Passwords don't match" });

function serverMessage(error, fallback) {
  return error?.response?.data?.message || fallback;
}

/**
 * Forgot password (`/auth/forgot-password`) — two steps on one page:
 *  1. the email → `POST /auth/forgot-password` emails a 6-digit code (the answer is the same whether or not the
 *     address has an account, so nothing here reveals that);
 *  2. the code and a new password (same rules as signing up) → `POST /auth/reset-password`, then on to Log In.
 * "Send the code again" repeats step 1.
 */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(null); // set once the code has been sent
  const forgot = useForgotPassword();
  const reset = useResetPassword();

  const emailForm = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: '' } });
  const resetForm = useForm({ resolver: zodResolver(resetSchema), defaultValues: { code: '', newPassword: '', confirmPassword: '' } });
  const newPassword = resetForm.watch('newPassword', '');

  function sendCode({ email: address }) {
    forgot.mutate(
      { email: address },
      {
        onSuccess: () => {
          setEmail(address);
          toast.success('If that email has an account, a code is on its way.');
        },
        onError: (error) => emailForm.setError('email', { type: 'server', message: serverMessage(error, "We couldn't send a code. Try again.") }),
      }
    );
  }

  function resetPassword({ code, newPassword: password }) {
    reset.mutate(
      { email, code, newPassword: password },
      {
        onSuccess: () => {
          toast.success('Your password has been changed. Log in with the new one.');
          navigate('/auth/login', { replace: true, state: { email } });
        },
        onError: (error) => resetForm.setError('code', { type: 'server', message: serverMessage(error, "That code didn't work. Check it, or send a new one.") }),
      }
    );
  }

  return (
    <AuthBackdrop images={AUTH_PHOTOS} title="Back on the road in a minute" subtitle="Reset your password with a code we email you.">
      <PageTitle title="Forgot Password" />
      <AuthCard>
        {!email ? (
          <>
            <div className="text-center">
              <h1 className="font-heading text-ink text-2xl font-bold">Forgot your password?</h1>
              <p className="text-muted text-sm mt-1.5">Enter your email and we&apos;ll send you a 6-digit code to reset it.</p>
            </div>
            <form onSubmit={emailForm.handleSubmit(sendCode)} className="flex flex-col gap-4" noValidate>
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                error={emailForm.formState.errors.email?.message}
                register={emailForm.register('email')}
              />
              <Button type="submit" size="lg" loading={forgot.isPending} className="mt-2">
                Send code
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="text-center flex flex-col items-center gap-2">
              <MailCheck size={28} className="text-brand-gold-deep" aria-hidden="true" />
              <h1 className="font-heading text-ink text-2xl font-bold">Check your email</h1>
              <p className="text-muted text-sm">
                If <span className="font-medium text-ink">{email}</span> has an account, we&apos;ve sent it a 6-digit code.
              </p>
            </div>
            <form onSubmit={resetForm.handleSubmit(resetPassword)} className="flex flex-col gap-4" noValidate>
              <Input
                label="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                error={resetForm.formState.errors.code?.message}
                register={resetForm.register('code')}
              />
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                error={resetForm.formState.errors.newPassword?.message}
                register={resetForm.register('newPassword')}
              />
              <PasswordChecklist password={newPassword} />
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                error={resetForm.formState.errors.confirmPassword?.message}
                register={resetForm.register('confirmPassword')}
              />
              <Button type="submit" size="lg" loading={reset.isPending} className="mt-2">
                Reset password
              </Button>
            </form>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
              <button
                type="button"
                onClick={() => sendCode({ email })}
                disabled={forgot.isPending}
                className="font-semibold text-accent hover:text-accent-hover focus-ring rounded-md disabled:opacity-50"
              >
                Send the code again
              </button>
              <button
                type="button"
                onClick={() => setEmail(null)}
                className="text-muted hover:text-ink focus-ring rounded-md"
              >
                Use a different email
              </button>
            </div>
          </>
        )}
        <p className="pt-5 border-t border-black/10 text-center text-muted text-sm">
          Remembered it?{' '}
          <Link to="/auth/login" className="text-accent hover:text-accent-hover font-semibold focus-ring rounded-md">
            Log in
          </Link>
        </p>
      </AuthCard>
    </AuthBackdrop>
  );
}
