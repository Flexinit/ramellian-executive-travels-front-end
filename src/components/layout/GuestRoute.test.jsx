// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GuestRoute from './GuestRoute';
import { useAuthStore } from '../../store/authStore';

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
});

function renderWithRoutes(route = '/auth/login') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/auth/login" element={<p>Login Page</p>} />
        </Route>
        <Route path="/dashboard" element={<p>Dashboard Page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('GuestRoute', () => {
  it('renders the outlet when unauthenticated', () => {
    renderWithRoutes();
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to /dashboard when authenticated', () => {
    act(() => {
      useAuthStore.setState({ token: 'abc', user: { id: '1', role: 'RENTER' } });
    });
    renderWithRoutes();
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
