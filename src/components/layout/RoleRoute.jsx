import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * Wraps role-gated routes (owner/admin panels). Unauthenticated visitors go
 * to the main page; authenticated visitors lacking an allowed role are bounced to
 * their dashboard rather than shown a permission error.
 *
 * @param {string[]} allowedRoles
 * @param {string} redirectTo
 */
export default function RoleRoute({ allowedRoles = [], redirectTo = '/dashboard' }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!user?.roles?.some((role) => allowedRoles.includes(role))) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
