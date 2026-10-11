import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * Wraps guest-only routes (e.g. `/auth/*`). Signed-in users are redirected
 * away — there's no reason to show a login form to someone already logged in.
 *
 * @param {string} redirectTo
 */
export default function GuestRoute({ redirectTo = '/dashboard' }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
