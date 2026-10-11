// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import UserMenu from './UserMenu';
import { useAuthStore } from '../../store/authStore';

afterEach(() => {
  useAuthStore.setState({ token: null, user: null });
});

function renderMenu() {
  return render(
    <MemoryRouter>
      <UserMenu />
    </MemoryRouter>
  );
}

function setUser(role) {
  act(() => {
    useAuthStore.setState({
      token: 'abc',
      user: { id: '1', firstName: 'John', lastName: 'Kamau', email: 'john@example.com', roles: [role] },
    });
  });
}

describe('UserMenu', () => {
  it('renders nothing when there is no user', () => {
    const { container } = renderMenu();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the avatar trigger for a signed-in user', () => {
    setUser('RENTER');
    renderMenu();
    expect(screen.getByRole('button', { name: /account menu for john kamau/i })).toBeInTheDocument();
  });

  it('falls back to the email when the fuller profile has not loaded yet', () => {
    act(() => {
      useAuthStore.setState({ token: 'abc', user: { id: '1', email: 'john@example.com', roles: ['RENTER'] } });
    });
    renderMenu();
    expect(screen.getByRole('button', { name: /account menu for john@example.com/i })).toBeInTheDocument();
  });

  it('shows only Dashboard and Log Out for a renter', async () => {
    const user = userEvent.setup();
    setUser('RENTER');
    renderMenu();
    await user.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByRole('menuitem', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /owner panel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /admin panel/i })).not.toBeInTheDocument();
  });

  it('shows Owner Panel for an owner', async () => {
    const user = userEvent.setup();
    setUser('OWNER');
    renderMenu();
    await user.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByRole('menuitem', { name: /owner panel/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /admin panel/i })).not.toBeInTheDocument();
  });

  it('shows Admin Panel for an admin', async () => {
    const user = userEvent.setup();
    setUser('ADMIN');
    renderMenu();
    await user.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByRole('menuitem', { name: /admin panel/i })).toBeInTheDocument();
  });

  it("doesn't show an Owner Panel link to a super admin who owns nothing (their token carries a fleet-manager role anyway)", async () => {
    const user = userEvent.setup();
    act(() => useAuthStore.setState({ token: 'abc', user: { id: '1', firstName: 'Sam', lastName: 'Super', email: 'sam@example.com', roles: ['ADMIN', 'MANAGER'] } }));
    renderMenu();
    await user.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByRole('menuitem', { name: /admin panel/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /owner panel/i })).not.toBeInTheDocument();
  });

  it('shows the Owner Panel to a super admin who really does own vehicles', async () => {
    const user = userEvent.setup();
    act(() => useAuthStore.setState({ token: 'abc', user: { id: '1', firstName: 'Sam', lastName: 'Super', email: 'sam@example.com', roles: ['ADMIN', 'MANAGER', 'OWNER'] } }));
    renderMenu();
    await user.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByRole('menuitem', { name: /owner panel/i })).toBeInTheDocument();
  });

  it('clears the auth store when Log Out is clicked', async () => {
    const user = userEvent.setup();
    setUser('RENTER');
    renderMenu();
    await user.click(screen.getByRole('button', { name: /account menu/i }));
    await user.click(screen.getByRole('menuitem', { name: /log out/i }));
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('has no accessibility violations', async () => {
    setUser('RENTER');
    const { container } = renderMenu();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
