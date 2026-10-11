import React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import PageTitle from '../components/layout/PageTitle';
import Divider from '../components/ui/Divider';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import { useGoogleLogin, useLogin } from '../hooks/useAuth';
import { isGoogleSignInEnabled } from '../lib/features';
import AuthBackdrop from '../components/layout/AuthBackdrop';
import nairobiSkyline from '../assets/destinations/nairobi-skyline.jpg';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
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
    <AuthBackdrop image={nairobiSkyline}>
      <PageTitle title="Log In" />
      <div className="w-full max-w-sm flex flex-col gap-8">

        <div className="bg-brand-navy/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-card p-7 sm:p-8 flex flex-col gap-6">
          <div className="text-center">
            <h1 className="font-heading text-brand-white text-2xl font-bold">Welcome back</h1>
            <p className="text-brand-grey text-sm mt-1.5">Log in to your account.</p>
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
        </div>

        <p className="text-center text-brand-grey text-sm">
          Don&apos;t have an account?{' '}
          <Link to="/auth/register" className="text-brand-gold hover:text-brand-gold-light font-semibold focus-ring rounded-md">
            Create one
          </Link>
        </p>
      </div>
    </AuthBackdrop>
  );
}
