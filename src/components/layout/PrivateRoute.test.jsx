// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import { useAuthStore } from '../../store/authStore';

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
});

function renderWithRoutes(route = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<p>Dashboard Page</p>} />
        </Route>
        <Route path="/" element={<p>Home Page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PrivateRoute', () => {
  it('sends an unauthenticated visitor to the main page', () => {
    renderWithRoutes();
    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });

  it('renders the outlet when authenticated', () => {
    act(() => {
      useAuthStore.setState({ token: 'abc', user: { id: '1', role: 'RENTER' } });
    });
    renderWithRoutes();
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
