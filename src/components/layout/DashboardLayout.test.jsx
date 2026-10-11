// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { axe } from 'jest-axe';
import DashboardLayout from './DashboardLayout';
import { useAuthStore } from '../../store/authStore';
import { useProfilePhotoStore } from '../../store/profilePhotoStore';

afterEach(() => {
  act(() => {
    useAuthStore.setState({ token: null, user: null });
    useProfilePhotoStore.setState({ photoUrl: null, userId: null });
  });
  localStorage.clear();
});

const items = [
  { label: 'Overview', to: '/dashboard' },
  { label: 'My Bookings', to: '/dashboard/bookings' },
];

function renderLayout(route = '/dashboard') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route element={<DashboardLayout items={items} heading="Dashboard" />}>
            <Route path="/dashboard" element={<p>Overview content</p>} />
            <Route path="/dashboard/bookings" element={<p>Bookings content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DashboardLayout', () => {
  it('renders the sidebar nav items', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Bookings' })).toBeInTheDocument();
  });

  it('renders the heading', () => {
    renderLayout();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders the routed child via Outlet for the current route', () => {
    renderLayout('/dashboard');
    expect(screen.getByText('Overview content')).toBeInTheDocument();
    expect(screen.queryByText('Bookings content')).not.toBeInTheDocument();
  });

  it('renders a different routed child when the route changes', () => {
    renderLayout('/dashboard/bookings');
    expect(screen.getByText('Bookings content')).toBeInTheDocument();
  });

  it('highlights only the active sidebar item', () => {
    renderLayout('/dashboard/bookings');
    expect(screen.getByRole('link', { name: 'My Bookings' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('is a single menu that reshapes with the screen (strip on phones, sidebar from md up), not one that disappears', () => {
    const { container } = renderLayout();
    expect(screen.getAllByRole('navigation', { name: 'Dashboard' })).toHaveLength(1);
    const nav = screen.getByRole('navigation', { name: 'Dashboard' });
    expect(nav.className).toContain('flex-row');
    expect(nav.className).toContain('md:flex-col');
    expect(nav.className).toContain('overflow-x-auto');
    // No `hidden` on the menu itself at any size.
    expect(container.querySelector('aside').className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it("opens with the signed-in person's photo and name — the logo is in the top bar, not repeated here", () => {
    act(() => useAuthStore.setState({ token: 't', user: { id: 'u1', email: 'a@x.com', firstName: 'Ann', lastName: 'Lee', roles: ['OWNER'] } }));
    renderLayout();

    const profile = screen.getByRole('link', { name: /ann lee — view your profile/i });
    expect(profile).toHaveAttribute('href', '/dashboard/profile');
    expect(within(profile).getByText('Ann Lee')).toBeInTheDocument();
    expect(within(profile).getByLabelText('Ann Lee')).toBeInTheDocument(); // initials avatar
    expect(screen.queryByText('RAMELLIAN')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /home/i })).not.toBeInTheDocument();
  });

  it('shows their profile photo when they have one', () => {
    localStorage.setItem('ramellian:profilePhoto:u1', 'data:image/png;base64,AAAA');
    act(() => useAuthStore.setState({ token: 't', user: { id: 'u1', email: 'a@x.com', firstName: 'Ann', lastName: 'Lee', roles: ['RENTER'] } }));
    renderLayout();

    expect(within(screen.getByRole('link', { name: /view your profile/i })).getByRole('img', { name: 'Ann Lee' })).toHaveAttribute(
      'src',
      'data:image/png;base64,AAAA'
    );
  });

  it('falls back to the email when the name has not loaded yet', () => {
    act(() => useAuthStore.setState({ token: 't', user: { id: 'u1', email: 'a@x.com', roles: ['RENTER'] } }));
    renderLayout();
    expect(screen.getByRole('link', { name: /a@x.com — view your profile/i })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderLayout();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows the unread messages and notifications next to their menu items', async () => {
    server.use(
      http.get(`${import.meta.env.VITE_API_BASE_URL}/api/v1/notifications/unread-count`, () => HttpResponse.json({ unreadCount: 5 })),
      http.get(`${import.meta.env.VITE_API_BASE_URL}/api/v1/chat/conversations`, () =>
        HttpResponse.json([{ otherUserId: 'x', bookingId: 'b1', unreadCount: 2 }, { otherUserId: 'y', unreadCount: 1 }])
      )
    );
    act(() => useAuthStore.setState({ token: 't', user: { id: 'u1', email: 'a@x.com', roles: ['RENTER'] } }));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              element={
                <DashboardLayout
                  heading="Dashboard"
                  items={[
                    { label: 'Messages', to: '/messages', badge: 'messages' },
                    { label: 'Inbox', to: '/inbox', badge: 'notifications' },
                  ]}
                />
              }
            >
              <Route path="/dashboard" element={<p>x</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const inboxLink = await screen.findByRole('link', { name: /^inbox/i });
    expect(await within(inboxLink).findByLabelText('5 unread')).toBeInTheDocument();
    // 2 + 1 unread messages across the conversations
    const messagesLink = screen.getByRole('link', { name: /^messages/i });
    expect(await within(messagesLink).findByLabelText('3 unread')).toBeInTheDocument();
  });
});
