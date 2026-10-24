import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { UserPlus } from 'lucide-react';
import PageTitle from '../components/layout/PageTitle';
import Divider from '../components/ui/Divider';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import RememberMe from '../components/auth/RememberMe';
import { useGoogleLogin, useLogin } from '../hooks/useAuth';
import { isGoogleSignInEnabled } from '../lib/features';
import AuthBackdrop from '../components/layout/AuthBackdrop';
import AuthCard from '../components/auth/AuthCard';
import { AUTH_PHOTOS } from '../lib/authPhotos';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  // After resetting a password, the email comes along so it doesn't have to be typed again.
  const emailFromReset = useLocation().state?.email;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: emailFromReset || '' } });
  const login = useLogin();
  const googleLogin = useGoogleLogin();

  function onSubmit(values) {
    login.mutate(values, {
      onError: (error) => {
        const status = error?.response?.status;
        if (status === 401) {
          setError('password', { type: 'server', message: 'Incorrect email or password.' });
          return;
        }
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
    <AuthBackdrop images={AUTH_PHOTOS} title="Welcome back to executive travel" subtitle="Log in to manage your bookings, documents and payments.">
      <PageTitle title="Log In" />
      <div className="w-full">

        <AuthCard>
          <div className="text-center">
            <h1 className="font-heading text-ink text-2xl font-bold">Welcome back</h1>
            <p className="text-muted text-sm mt-1.5">Log in to your account.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              register={register('email')}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              register={register('password')}
            />
            <Link
              to="/auth/forgot-password"
              className="-mt-2 self-end text-xs font-semibold text-accent hover:text-accent-hover focus-ring rounded-md"
            >
              Forgot password?
            </Link>

            <RememberMe />
            <Button type="submit" size="lg" loading={login.isPending} className="mt-2">
              Log In
            </Button>
          </form>

          {(isGoogleSignInEnabled() || import.meta.env.DEV) && (
            <>
              <Divider label="or" />
              <GoogleSignInButton text="signin_with" onCredential={googleLogin.mutate} disabled={googleLogin.isPending || login.isPending} />
            </>
          )}

          {/* Easy to spot: a full-width button, not a small link — inside the card, so the form is one unit. */}
          <div className="flex flex-col gap-2 pt-5 border-t border-black/10 text-center">
            <p className="text-ink text-sm font-medium">New to Ramellian Executive Travels?</p>
            <Button to="/auth/register" variant="outline" size="lg" className="w-full">
              <UserPlus size={16} aria-hidden="true" /> Create an account
            </Button>
          </div>
        </AuthCard>
      </div>
    </AuthBackdrop>
  );
}
