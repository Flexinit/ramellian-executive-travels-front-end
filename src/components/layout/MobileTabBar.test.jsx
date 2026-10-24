import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

const authState = { authed: true };
vi.mock('../../store/authStore', () => ({
  useAuthStore: (sel) => sel({ isAuthenticated: () => authState.authed }),
}));
vi.mock('../../hooks/useNotifications', () => ({ useUnreadNotificationCount: () => ({ data: 3 }) }));
vi.mock('../../hooks/useChat', () => ({ useUnreadMessageCount: () => 0 }));

import MobileTabBar from './MobileTabBar';

function renderAt(path) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <MobileTabBar />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('MobileTabBar', () => {
  it('shows the five tabs and marks the current one', () => {
    authState.authed = true;
    renderAt('/vehicles');
    const nav = screen.getByRole('navigation', { name: 'Quick links' });
    expect(nav).toHaveClass('md:hidden');
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.getByRole('link', { name: 'Search vehicles' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Go to Home' })).not.toHaveAttribute('aria-current');
  });

  it('shows the unread count on the Inbox tab', () => {
    authState.authed = true;
    renderAt('/');
    expect(screen.getByLabelText('3 unread')).toBeInTheDocument();
  });

  it('is not shown to a visitor', () => {
    authState.authed = false;
    renderAt('/');
    expect(screen.queryByRole('navigation', { name: 'Quick links' })).not.toBeInTheDocument();
  });
});
