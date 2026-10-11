import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * Wraps authenticated-only routes. Unauthenticated visitors are sent to the main page (not the login
 * form) — a plain page refresh now survives (the token is mirrored into sessionStorage, see
 * authStore.js), but there's still no durable session beyond that (closing the tab, or arriving fresh
 * from an external redirect with no token of its own, signs the visitor out), so landing on the home
 * page rather than a login wall stays the right default. The attempted location is stashed in state in
 * case a caller wants to send them back after login.
 *
 * @param {string} redirectTo
 */
export default function PrivateRoute({ redirectTo = '/' }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return <Outlet />;
}
