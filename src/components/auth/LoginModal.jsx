import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Drawer from '../ui/Drawer';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { UserPlus } from 'lucide-react';
import Divider from '../ui/Divider';
import GoogleSignInButton from './GoogleSignInButton';
import RememberMe from './RememberMe';
import { useGoogleLogin, useLogin } from '../../hooks/useAuth';
import { isGoogleSignInEnabled } from '../../lib/features';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * The same email/password sign-in as LoginPage, offered as a right-side drawer instead of a full page
 * navigation — for a moment like BookingCheckoutPage's "I have an account", where leaving to a whole separate
 * page would break the sense that this is still the same booking, not a different errand; the drawer slides in
 * over a dimmed-but-visible page rather than covering it like a centered popup would. `useLogin`'s own success
 * handling (toast, `setToken`, and — since a guest only ever sees this with items already in their cart —
 * `completeLogin`'s own navigate back to `/booking/checkout`) is unchanged; the caller just closes this drawer
 * once `isAuthenticated` flips true, the same signal `useReturnToCheckoutAfterAuth` already watches globally.
 *
 * "Create one" opens `RegisterModal` in place instead of navigating, when the caller wires `onSwitchToRegister`
 * (see BookingCheckoutPage); otherwise it falls back to linking to the real `/auth/register` page.
 *
 * @param {boolean} isOpen @param {function} onClose
 * @param {function} [onReopen] — forwarded to `Drawer`'s restore tab, shown after this is dismissed
 * @param {function} [onSwitchToRegister] — "Create one" — if omitted, falls back to a real link to the full
 *   `/auth/register` page (e.g. if this is ever used somewhere without a matching RegisterModal alongside it)
 */
export default function LoginModal({ isOpen, onClose, onReopen, onSwitchToRegister }) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
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

  // Clears the form (not just hides it) whenever this modal is dismissed without logging in, so a half-typed
  // email/password doesn't resurface for whoever opens it next — including a different person on a shared device.
  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Drawer isOpen={isOpen} onClose={handleClose} onReopen={onReopen} title="Log In" size="sm">
      <div className="flex flex-col gap-5">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} register={register('email')} />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            register={register('password')}
          />
          <RememberMe />
          <Button type="submit" size="lg" loading={login.isPending} className="mt-1">
            Log In
          </Button>
        </form>

        {(isGoogleSignInEnabled() || import.meta.env.DEV) && (
          <>
            <Divider label="or" />
            <GoogleSignInButton text="signin_with" onCredential={googleLogin.mutate} disabled={googleLogin.isPending || login.isPending} />
          </>
        )}

        {/* Easy to spot: a full-width button, not a small link. */}
        <div className="flex flex-col gap-2 rounded-xl border border-black/10 bg-black/5 p-4 text-center">
          <p className="text-ink text-sm font-medium">New to Ramellian Executive Travels?</p>
          {onSwitchToRegister ? (
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                reset();
                onSwitchToRegister();
              }}
            >
              <UserPlus size={16} aria-hidden="true" /> Create an account
            </Button>
          ) : (
            <Button to="/auth/register" size="lg" className="w-full" onClick={handleClose}>
              <UserPlus size={16} aria-hidden="true" /> Create an account
            </Button>
          )}
        </div>
      </div>
    </Drawer>
  );
}
