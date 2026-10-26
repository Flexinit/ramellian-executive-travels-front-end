import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogIn } from 'lucide-react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Divider from '../ui/Divider';
import GoogleSignInButton from './GoogleSignInButton';
import { useGoogleLogin, useLogin } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { isGoogleSignInEnabled } from '../../lib/features';

/**
 * When the session ends (the backend refuses even `GET /users/me` — useSessionExpiry), the person isn't thrown out:
 * this asks them to log in again right over the page they're on. There's no refresh endpoint (login returns only an
 * access token), so logging in again is the re-authentication. Once they're back in, every query refetches and they
 * carry on exactly where they were — the page, a half-filled form, their booking. "Sign out instead" is the only way
 * out (closing it would leave a page that can't load anything).
 *
 * Mounted once near the app root (App.jsx's RootLayout); shows itself while `authStore.sessionExpired` is set.
 */
export default function ReauthModal() {
  const expired = useAuthStore((s) => s.sessionExpired);
  const email = useAuthStore((s) => s.user?.email || '');
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const afterLogin = { onSuccess: () => { setPassword(''); queryClient.invalidateQueries(); } };
  const login = useLogin({ stayOnPage: true });
  const googleLogin = useGoogleLogin('login', { stayOnPage: true });

  function submit(e) {
    e.preventDefault();
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setError(null);
    login.mutate(
      { email, password },
      {
        ...afterLogin,
        onError: (err) => {
          const status = err?.response?.status;
          if (status === 401 || status === 422) setError(err?.response?.data?.message || 'That password is not right.');
        },
      }
    );
  }

  function signOut() {
    clearAuth();
    queryClient.clear();
    navigate('/');
  }

  return (
    <Modal isOpen={expired} onClose={() => {}} dismissible={false} title="Please log in again" size="sm">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          Your session has ended. Log in again to carry on — you&apos;ll stay on this page and nothing you were doing is lost.
        </p>
        <Input label="Email" type="email" value={email} readOnly autoComplete="username" />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          error={error}
          autoFocus
        />
        <Button type="submit" loading={login.isPending}>
          {!login.isPending && <LogIn size={16} aria-hidden="true" />} Log in
        </Button>
        {(isGoogleSignInEnabled() || import.meta.env.DEV) && (
          <>
            <Divider label="or" />
            <GoogleSignInButton text="signin_with" onCredential={(token) => googleLogin.mutate(token, afterLogin)} disabled={googleLogin.isPending || login.isPending} />
          </>
        )}
        <button
          type="button"
          onClick={signOut}
          className="self-center text-sm text-muted hover:text-ink underline underline-offset-2 transition-colors focus-ring rounded-md py-1.5 -my-1.5"
        >
          Sign out instead
        </button>
      </form>
    </Modal>
  );
}
