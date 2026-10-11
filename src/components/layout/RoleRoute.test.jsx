// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RoleRoute from './RoleRoute';
import { useAuthStore } from '../../store/authStore';

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
});

function renderWithRoutes(route, allowedRoles) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<RoleRoute allowedRoles={allowedRoles} />}>
          <Route path="/admin" element={<p>Admin Page</p>} />
        </Route>
        <Route path="/" element={<p>Home Page</p>} />
        <Route path="/dashboard" element={<p>Dashboard Page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RoleRoute', () => {
  it('sends an unauthenticated visitor to the main page', () => {
    renderWithRoutes('/admin', ['ADMIN']);
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('redirects to /dashboard when authenticated but lacking an allowed role', () => {
    act(() => {
      useAuthStore.setState({ token: 'abc', user: { id: '1', roles: ['RENTER'] } });
    });
    renderWithRoutes('/admin', ['ADMIN']);
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('renders the outlet when the user has an allowed role', () => {
    act(() => {
      useAuthStore.setState({ token: 'abc', user: { id: '1', roles: ['ADMIN'] } });
    });
    renderWithRoutes('/admin', ['ADMIN']);
    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });

  it('renders the outlet when the user has one of several roles', () => {
    act(() => {
      useAuthStore.setState({ token: 'abc', user: { id: '1', roles: ['RENTER', 'OWNER'] } });
    });
    renderWithRoutes('/admin', ['ADMIN', 'OWNER']);
    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });
});
