// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';
import { USER_ROLES } from './lib/constants';

function renderWithProviders(ui, { route = '/' } = {}) {
  const testQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter
          initialEntries={[route]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function signInAs(role) {
  act(() => {
    useAuthStore.setState({
      token: 'test-token',
      user: { id: '1', firstName: 'Test', lastName: 'User', email: 'test@example.com', roles: [role] },
    });
  });
}

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null, mode: null }));
});

// Every page is a React.lazy() chunk (implementation-plan.md 12.7), so the
// first assertion after a render must `await` it — the Suspense fallback
// renders first, then the real page content resolves a tick later.
describe('App routing', () => {
  it('renders the real home page at "/"', async () => {
    renderWithProviders(<App />, { route: '/' });
    expect(await screen.findByRole('heading', { name: /executive travel, reimagined/i })).toBeInTheDocument();
  });

  it('renders the real vehicles search page at "/vehicles"', async () => {
    renderWithProviders(<App />, { route: '/vehicles' });
    expect(await screen.findByRole('heading', { name: /browse vehicles/i })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: /search vehicles/i })).toBeInTheDocument();
  });

  it('renders the real login page at "/auth/login"', async () => {
    renderWithProviders(<App />, { route: '/auth/login' });
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('redirects an authenticated visitor away from "/auth/login"', async () => {
    signInAs(USER_ROLES.RENTER);
    renderWithProviders(<App />, { route: '/auth/login' });
    expect(await screen.findByRole('heading', { name: /welcome/i })).toBeInTheDocument();
  });

  it('sends someone with a booking waiting to checkout after logging in, not the dashboard GuestRoute would otherwise land them on', async () => {
    // Exercises the *real* route tree — unlike the isolated LoginPage render elsewhere, this is the one
    // place GuestRoute (which defaults an authenticated visitor on a guest-only route to /dashboard) is
    // actually part of what's rendered, so it's the one test that can catch that race.
    const user = userEvent.setup();
    act(() => useCartStore.setState({ items: [{ vehicleId: 'v1', vehicle: { model: 'Prado' }, startTime: null, endTime: null, bookingMode: 'SELF_DRIVE' }], contact: null, groupId: null }));
    renderWithProviders(<App />, { route: '/auth/login' });

    await user.type(await screen.findByLabelText('Email'), 'ann@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /^log in$/i }));

    expect(await screen.findByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    act(() => useCartStore.setState({ items: [], contact: null, groupId: null }));
  });

  it('sends a signed-out visitor from "/dashboard" to the main page', async () => {
    renderWithProviders(<App />, { route: '/dashboard' });
    expect(await screen.findByRole('heading', { name: /executive travel, reimagined/i })).toBeInTheDocument();
  });

  it('signs the user out and returns to the main page when the session expires (401)', async () => {
    signInAs(USER_ROLES.RENTER);
    renderWithProviders(<App />, { route: '/dashboard' });
    await screen.findByRole('heading', { name: /welcome, test/i });

    act(() => {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    });

    expect(await screen.findByRole('heading', { name: /executive travel, reimagined/i })).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('ignores a 401 while nobody is signed in (e.g. a wrong password on the login form)', async () => {
    renderWithProviders(<App />, { route: '/auth/login' });
    await screen.findByRole('heading', { name: /welcome back/i });

    act(() => {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    });

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it("gives a renter Profile in the left menu, and no promotion to rent out a car", async () => {
    signInAs(USER_ROLES.RENTER);
    renderWithProviders(<App />, { route: '/dashboard' });
    const menu = await screen.findByRole('navigation', { name: 'Dashboard' });

    expect(within(menu).getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/dashboard/profile');
    expect(within(menu).queryByRole('link', { name: /list your car/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /list your car|rent a car/i })).not.toBeInTheDocument();
  });

  describe('the left menu is on every page for a signed-in person, and is always the same one', () => {
    it.each([
      ['the home page', '/'],
      ['browsing vehicles', '/vehicles'],
      ['a single vehicle', '/vehicles/v1'],
      ['the fleet page', '/fleet'],
      ['About', '/about'],
      ['Contact', '/contact'],
      ['the FAQ', '/faq'],
      ['the booking basket', '/booking'],
      ['checkout', '/booking/checkout'],
      ['the Inbox', '/inbox'],
      ['Messages', '/messages'],
      ['a page that does not exist', '/no-such-page'],
    ])('a renter has the menu on %s', async (_name, route) => {
      signInAs(USER_ROLES.RENTER);
      renderWithProviders(<App />, { route });
      const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
      expect(within(menu).getByRole('link', { name: 'My Bookings' })).toBeInTheDocument();
      expect(within(menu).getByRole('link', { name: 'Browse Vehicles' })).toHaveAttribute('href', '/vehicles');
    });

    // The menu depends only on who the person is (and how they logged in), never on the page.
    const PAGES = ['/', '/vehicles', '/vehicles/v1', '/about', '/contact', '/inbox', '/messages', '/booking',
      '/dashboard', '/dashboard/profile', '/dashboard/documents', '/dashboard/bookings', '/owner', '/owner/vehicles'];

    it.each(PAGES)('a car owner has the same Owner Panel menu on %s', async (route) => {
      signInAs(USER_ROLES.OWNER);
      renderWithProviders(<App />, { route });
      const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
      expect(within(menu).getAllByRole('link').map((l) => l.textContent)).toEqual([
        'Overview', 'Profile', 'My Vehicles', 'Fleet Bookings', 'Booking Calendar', 'Messages', 'Inbox', 'Assistant', 'Add Vehicle', 'Reports', 'Contract Templates',
        'Booking Policy', 'Statements', 'Documents', 'Browse Vehicles', 'Switch to Renter', 'Back to Main Site',
      ]);
      expect(screen.getAllByRole('navigation', { name: 'Dashboard' })).toHaveLength(1);
    });

    it.each(['/', '/vehicles', '/inbox', '/dashboard', '/dashboard/profile', '/dashboard/documents'])(
      'a renter has the same Dashboard menu on %s — with no "List Your Car" promotion',
      async (route) => {
        signInAs(USER_ROLES.RENTER);
        renderWithProviders(<App />, { route });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
        expect(within(menu).getAllByRole('link').map((l) => l.textContent)).toEqual([
          'Overview', 'Profile', 'My Bookings', 'Messages', 'Inbox', 'Assistant', 'Documents', 'Browse Vehicles',
        ]);
        expect(screen.queryByRole('link', { name: /list your car|rent a car/i })).not.toBeInTheDocument();
      }
    );

    it.each(['/vehicles', '/inbox', '/dashboard/profile', '/admin'])('an admin has the same Admin Panel menu on %s', async (route) => {
      signInAs(USER_ROLES.ADMIN);
      renderWithProviders(<App />, { route });
      const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
      const labels = within(menu).getAllByRole('link').map((l) => l.textContent);
      expect(labels[0]).toBe('Overview');
      expect(labels).toContain('All Bookings');
      expect(labels).toContain('Contract Templates');
    });

    it('gives someone who is both an owner and a renter the owner menu plus their own bookings, everywhere', async () => {
      act(() =>
        useAuthStore.setState({
          token: 'test-token',
          user: { id: '1', firstName: 'Test', lastName: 'User', email: 'test@example.com', roles: [USER_ROLES.OWNER, USER_ROLES.RENTER] },
        })
      );
      for (const route of ['/vehicles', '/dashboard/profile']) {
        const { unmount } = renderWithProviders(<App />, { route });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
        const labels = within(menu).getAllByRole('link').map((l) => l.textContent);
        expect(labels).toContain('My Vehicles');
        expect(labels).toContain('Fleet Bookings');
        expect(labels).toContain('My Bookings');
        unmount();
      }
    });

    describe('a menu for someone with two roles is grouped, so the list stays short', () => {
      const headingButtons = (menu) => within(menu).getAllByRole('button').map((b) => b.textContent);

      it('groups a super admin who also owns cars into Administration and My Fleet, with the rest ungrouped', async () => {
        act(() => {
          useAuthStore.setState({ token: 'test-token', user: { id: '1', firstName: 'Felix', lastName: 'W', email: 'felixwanzetse@gmail.com' } });
          useAuthStore.getState().setUser({ roles: ['SUPER_ADMIN', 'MANAGE', 'CAR_OWNER'] });
        });
        renderWithProviders(<App />, { route: '/admin' });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
        expect(headingButtons(menu)).toEqual(['Administration', 'Vehicles', 'Documents', 'My Fleet']);
      });

      it('keeps the section holding the current page open and folds the others away', async () => {
        act(() => {
          useAuthStore.setState({ token: 'test-token', user: { id: '1', firstName: 'Felix', lastName: 'W', email: 'felixwanzetse@gmail.com' } });
          useAuthStore.getState().setUser({ roles: ['SUPER_ADMIN', 'CAR_OWNER'] });
        });
        renderWithProviders(<App />, { route: '/admin/users' });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
        expect(within(menu).getByRole('button', { name: 'Administration' })).toHaveAttribute('aria-expanded', 'true');
        expect(within(menu).getByRole('button', { name: 'My Fleet' })).toHaveAttribute('aria-expanded', 'false');
      });

      it('opens and folds a section when its heading is clicked', async () => {
        const user = userEvent.setup();
        act(() => {
          useAuthStore.setState({ token: 'test-token', user: { id: '1', firstName: 'Felix', lastName: 'W', email: 'felixwanzetse@gmail.com' } });
          useAuthStore.getState().setUser({ roles: ['SUPER_ADMIN', 'CAR_OWNER'] });
        });
        renderWithProviders(<App />, { route: '/admin' });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
        const heading = within(menu).getByRole('button', { name: 'My Fleet' });
        expect(heading).toHaveAttribute('aria-expanded', 'false');
        await user.click(heading);
        expect(heading).toHaveAttribute('aria-expanded', 'true');
        await user.click(heading);
        expect(heading).toHaveAttribute('aria-expanded', 'false');
      });

      it("gives a super admin who owns nothing no fleet menu, even though the backend's token carries a fleet-manager role", async () => {
        act(() => {
          useAuthStore.setState({ token: 'test-token', user: { id: '1', firstName: 'Sam', lastName: 'Super', email: 'sam@example.com' } });
          useAuthStore.getState().setUser({ roles: ['SUPER_ADMIN', 'MANAGE'] });
        });
        renderWithProviders(<App />, { route: '/admin' });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
        const labels = within(menu).getAllByRole('link').map((l) => l.textContent);
        expect(labels).not.toContain('My Vehicles');
        expect(labels).not.toContain('Fleet Bookings');
        expect(headingButtons(menu)).toEqual(['Administration', 'Vehicles', 'Documents']);
      });

      it('groups an owner who also rents into My Fleet and My Rentals', async () => {
        act(() =>
          useAuthStore.setState({
            token: 'test-token',
            user: { id: '1', firstName: 'Test', lastName: 'User', email: 'test@example.com', roles: [USER_ROLES.OWNER, USER_ROLES.RENTER] },
          })
        );
        renderWithProviders(<App />, { route: '/owner' });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
        expect(headingButtons(menu)).toEqual(['My Fleet', 'My Rentals']);
      });

      it('gives each group heading its own icon', async () => {
        act(() => {
          useAuthStore.setState({ token: 'test-token', user: { id: '1', firstName: 'Felix', lastName: 'W', email: 'felixwanzetse@gmail.com' } });
          useAuthStore.getState().setUser({ roles: ['SUPER_ADMIN', 'CAR_OWNER'] });
        });
        renderWithProviders(<App />, { route: '/admin' });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
        for (const name of ['Administration', 'Vehicles', 'Documents', 'My Fleet']) {
          expect(within(menu).getByRole('button', { name }).querySelectorAll('svg')).toHaveLength(2); // its icon and the fold arrow
        }
      });

      it('puts the vehicle pages together under Vehicles, including Approved and Rejected Vehicles', async () => {
        act(() => {
          useAuthStore.setState({ token: 'test-token', user: { id: '1', firstName: 'Felix', lastName: 'W', email: 'felixwanzetse@gmail.com' } });
          useAuthStore.getState().setUser({ roles: ['SUPER_ADMIN'] });
        });
        renderWithProviders(<App />, { route: '/admin/vehicles/approved' });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
        expect(within(menu).getByRole('button', { name: 'Vehicles' })).toHaveAttribute('aria-expanded', 'true');
        for (const [label, href] of [
          ['All Vehicles', '/admin/vehicles'], ['Add Vehicle', '/admin/vehicles/new'], ['Vehicle Approvals', '/admin/vehicles/approvals'],
          ['Approved Vehicles', '/admin/vehicles/approved'], ['Rejected Vehicles', '/admin/vehicles/rejected'],
        ]) {
          expect(within(menu).getByRole('link', { name: label })).toHaveAttribute('href', href);
        }
        expect(await screen.findByRole('heading', { name: 'Approved Vehicles' })).toBeInTheDocument();
      });

      it('lists Approved and Rejected documents under Documents, next to Review Documents', async () => {
        act(() => {
          useAuthStore.setState({ token: 'test-token', user: { id: '1', firstName: 'Felix', lastName: 'W', email: 'felixwanzetse@gmail.com' } });
          useAuthStore.getState().setUser({ roles: ['SUPER_ADMIN'] });
        });
        renderWithProviders(<App />, { route: '/admin/documents/approved' });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
        expect(within(menu).getByRole('button', { name: 'Documents' })).toHaveAttribute('aria-expanded', 'true');
        expect(within(menu).getByRole('link', { name: 'Approved Documents' })).toHaveAttribute('href', '/admin/documents/approved');
        expect(within(menu).getByRole('link', { name: 'Rejected Documents' })).toHaveAttribute('href', '/admin/documents/rejected');
        expect(within(menu).getByRole('link', { name: 'Review Documents' })).toHaveAttribute('href', '/admin/documents');
        expect(await screen.findByRole('heading', { name: 'Approved Documents' })).toBeInTheDocument();
      });

      it("doesn't group a single-role menu", async () => {
        signInAs(USER_ROLES.RENTER);
        renderWithProviders(<App />, { route: '/dashboard' });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
        expect(within(menu).queryAllByRole('button')).toHaveLength(0);
      });
    });

    it.each([
      [USER_ROLES.RENTER, '/dashboard'],
      [USER_ROLES.OWNER, '/owner'],
      [USER_ROLES.ADMIN, '/admin'],
    ])('has Profile just below Overview for %s', async (role, route) => {
      signInAs(role);
      renderWithProviders(<App />, { route });
      const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
      const labels = within(menu).getAllByRole('link').map((l) => l.textContent);
      expect(labels[0]).toBe('Overview');
      expect(labels[1]).toBe('Profile');
      expect(within(menu).getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/dashboard/profile');
    });

    describe('an owner who chose to use the portal as a renter', () => {
      const asRenterOwner = () => {
        signInAs(USER_ROLES.OWNER);
        act(() => useAuthStore.getState().setMode('renter'));
      };

      it.each(['/', '/vehicles', '/inbox', '/dashboard', '/dashboard/profile', '/dashboard/documents'])(
        'has the renter menu on %s, with the way back to the owner side',
        async (route) => {
          asRenterOwner();
          renderWithProviders(<App />, { route });
          const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
          expect(within(menu).getAllByRole('link').map((l) => l.textContent)).toEqual([
            'Overview', 'Profile', 'My Bookings', 'Messages', 'Inbox', 'Assistant', 'Documents', 'Switch to Car Owner', 'Browse Vehicles',
          ]);
        }
      );

      it('goes back to the owner menu with "Switch to Car Owner", and stays there', async () => {
        const user = userEvent.setup();
        asRenterOwner();
        renderWithProviders(<App />, { route: '/dashboard' });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });

        await user.click(within(menu).getByRole('link', { name: 'Switch to Car Owner' }));

        expect(await screen.findByRole('link', { name: 'My Vehicles' })).toBeInTheDocument();
        expect(useAuthStore.getState().mode).toBe('owner');
        await user.click(screen.getByRole('link', { name: 'Profile' })); // an owner-menu link that opens a /dashboard page
        expect(screen.getByRole('link', { name: 'My Vehicles' })).toBeInTheDocument();
      });

      it('opening an Owner Panel page puts them back in owner mode', async () => {
        asRenterOwner();
        renderWithProviders(<App />, { route: '/owner/vehicles' });
        expect(await screen.findByRole('link', { name: 'Fleet Bookings' })).toBeInTheDocument();
        expect(useAuthStore.getState().mode).toBe('owner');
      });
    });

    it('the owner menu offers "Switch to Renter", which opens the renter dashboard in renter mode', async () => {
      const user = userEvent.setup();
      signInAs(USER_ROLES.OWNER);
      renderWithProviders(<App />, { route: '/owner' });
      const menu = await screen.findByRole('navigation', { name: 'Dashboard' });

      await user.click(within(menu).getByRole('link', { name: 'Switch to Renter' }));

      expect(await screen.findByRole('link', { name: 'My Bookings' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'My Vehicles' })).not.toBeInTheDocument();
      expect(useAuthStore.getState().mode).toBe('renter');
    });

    it('a plain renter never sees a switch (there is nothing to switch to)', async () => {
      signInAs(USER_ROLES.RENTER);
      act(() => useAuthStore.getState().setMode('owner'));
      renderWithProviders(<App />, { route: '/dashboard' });
      const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
      expect(within(menu).queryByRole('link', { name: /switch to/i })).not.toBeInTheDocument();
      expect(within(menu).queryByRole('link', { name: /list your car/i })).not.toBeInTheDocument();
    });

    describe('a super admin (the roles the live backend sends: SUPER_ADMIN, MANAGE, CAR_OWNER)', () => {
      const signInAsSuperAdmin = () => {
        act(() => {
          useAuthStore.setState({ token: 'test-token', user: { id: '1', firstName: 'Felix', lastName: 'W', email: 'felixwanzetse@gmail.com' } });
          useAuthStore.getState().setUser({ roles: ['SUPER_ADMIN', 'MANAGE', 'CAR_OWNER'] });
        });
      };

      it.each(['/admin', '/vehicles', '/inbox', '/dashboard/profile', '/owner/vehicles'])(
        'has the Admin Panel menu on %s, including their own fleet',
        async (route) => {
          signInAsSuperAdmin();
          renderWithProviders(<App />, { route });
          const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
          const labels = within(menu).getAllByRole('link').map((l) => l.textContent);
          expect(labels).toEqual([
            'Overview', 'Profile', 'Messages', 'Inbox', 'Assistant', 'Users', 'Roles & Permissions', 'All Bookings', 'Reports',
            'Contract Templates', 'Audit Log', 'Announcements', 'Platform Settings', 'Rental Terms', 'Owner Payouts', 'Quotations', 'All Vehicles', 'Add Vehicle', 'Vehicle Approvals', 'Approved Vehicles', 'Rejected Vehicles',
            'Review Documents', 'Approved Documents', 'Rejected Documents', 'My Vehicles', 'Fleet Bookings', 'Booking Calendar',
            'Back to Main Site',
          ]);
        }
      );

      it('can open the admin pages', async () => {
        signInAsSuperAdmin();
        renderWithProviders(<App />, { route: '/admin' });
        expect(await screen.findByRole('navigation', { name: 'Dashboard' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: /executive travel, reimagined/i })).not.toBeInTheDocument();
      });

      it('is shown as an Administrator in the menu header', async () => {
        signInAsSuperAdmin();
        renderWithProviders(<App />, { route: '/admin' });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
        expect(within(menu.closest('aside')).getByText('Administrator')).toBeInTheDocument();
      });
    });

    describe("only shows the items the person's permissions allow", () => {
      // Exactly what the live backend put in felixwanzetse@gmail.com's token.
      const LIVE_ADMIN_PERMISSIONS = [
        'VEHICLE_UPDATE', 'PAYMENT_CREATE', 'USER_DELETE', 'BOOKING_DELETE', 'BOOKING_READ', 'USER_MANAGE', 'PAYMENT_MANAGE',
        'VEHICLE_CREATE', 'PAYMENT_READ', 'VEHICLE_READ', 'BOOKING_MANAGE', 'VEHICLE_MANAGE', 'BOOKING_CREATE', 'PAYMENT_DELETE',
        'PROFILE_READ', 'REVIEW_READ', 'VEHICLE_DELETE', 'DOCUMENT_READ', 'REVIEW_CREATE', 'DOCUMENT_UPLOAD', 'BOOKING_UPDATE',
        'DOCUMENT_REVIEW', 'PERMISSION_MANAGE',
      ];
      const signInWith = (roles, permissions) => {
        act(() => {
          useAuthStore.setState({ token: 'test-token', user: { id: '1', firstName: 'Test', lastName: 'User', email: 'test@example.com' } });
          useAuthStore.getState().setUser({ roles, permissions });
        });
      };
      const menuLabels = async (route) => {
        renderWithProviders(<App />, { route });
        const menu = await screen.findByRole('navigation', { name: 'Dashboard' });
        return within(menu).getAllByRole('link').map((l) => l.textContent);
      };

      it('gives the live super admin account every item', async () => {
        signInWith(['SUPER_ADMIN', 'MANAGE', 'CAR_OWNER'], LIVE_ADMIN_PERMISSIONS);
        expect(await menuLabels('/admin')).toEqual([
          'Overview', 'Profile', 'Messages', 'Inbox', 'Assistant', 'Users', 'Roles & Permissions', 'All Bookings', 'Reports',
          'Contract Templates', 'Audit Log', 'Announcements', 'Platform Settings', 'Rental Terms', 'Owner Payouts', 'Quotations', 'All Vehicles', 'Add Vehicle', 'Vehicle Approvals', 'Approved Vehicles', 'Rejected Vehicles',
            'Review Documents', 'Approved Documents', 'Rejected Documents', 'My Vehicles', 'Fleet Bookings', 'Booking Calendar',
          'Back to Main Site',
        ]);
      });

      it('hides the vehicle and booking items from an administrator who lacks those permissions', async () => {
        signInWith(['SUPER_ADMIN'], ['USER_MANAGE', 'DOCUMENT_REVIEW']);
        expect(await menuLabels('/admin')).toEqual([
          'Overview', 'Profile', 'Messages', 'Inbox', 'Assistant', 'Users', 'Contract Templates', 'Audit Log', 'Announcements', 'Platform Settings', 'Rental Terms', 'Quotations', 'Review Documents', 'Approved Documents',
          'Rejected Documents', 'Back to Main Site',
        ]);
      });

      it('shows an administrator who can only manage users just the user pages', async () => {
        signInWith(['ADMIN'], ['USER_MANAGE']);
        expect(await menuLabels('/admin')).toEqual([
          'Overview', 'Profile', 'Messages', 'Inbox', 'Assistant', 'Users', 'Contract Templates', 'Audit Log', 'Announcements', 'Platform Settings', 'Rental Terms', 'Back to Main Site',
        ]);
      });

      it('hides Add Vehicle from an owner who can update vehicles but not create them', async () => {
        signInWith(['CAR_OWNER'], ['BOOKING_READ', 'VEHICLE_UPDATE', 'DOCUMENT_UPLOAD', 'PROFILE_READ']);
        expect(await menuLabels('/owner')).toEqual([
          'Overview', 'Profile', 'My Vehicles', 'Fleet Bookings', 'Booking Calendar', 'Messages', 'Inbox', 'Assistant', 'Reports', 'Contract Templates', 'Booking Policy', 'Statements', 'Documents', 'Browse Vehicles',
          'Switch to Renter', 'Back to Main Site',
        ]);
      });

      it('hides the fleet items from an owner without vehicle or booking permissions', async () => {
        signInWith(['CAR_OWNER'], ['PROFILE_READ', 'DOCUMENT_READ']);
        expect(await menuLabels('/owner')).toEqual([
          'Overview', 'Profile', 'Messages', 'Inbox', 'Assistant', 'Contract Templates', 'Booking Policy', 'Documents', 'Browse Vehicles', 'Switch to Renter', 'Back to Main Site',
        ]);
      });

      it('hides My Bookings and Documents from a renter without booking and document permissions', async () => {
        signInWith(['CAR_RENTER'], ['PROFILE_READ', 'VEHICLE_READ']);
        expect(await menuLabels('/dashboard')).toEqual(['Overview', 'Profile', 'Messages', 'Inbox', 'Assistant', 'Browse Vehicles']);
      });

      it('shows a renter with those permissions My Bookings and Documents', async () => {
        signInWith(['CAR_RENTER'], ['BOOKING_READ', 'DOCUMENT_UPLOAD']);
        expect(await menuLabels('/dashboard')).toEqual(['Overview', 'Profile', 'My Bookings', 'Messages', 'Inbox', 'Assistant', 'Documents', 'Browse Vehicles']);
      });

      it('judges by role alone when the token carries no permission list, rather than showing an empty menu', async () => {
        signInWith(['CAR_RENTER'], []);
        expect(await menuLabels('/dashboard')).toEqual(['Overview', 'Profile', 'My Bookings', 'Messages', 'Inbox', 'Assistant', 'Documents', 'Browse Vehicles']);
      });
    });

    it('is not shown to a visitor, who just gets the page', async () => {
      renderWithProviders(<App />, { route: '/vehicles' });
      await screen.findByRole('heading', { name: /browse vehicles/i });
      expect(screen.queryByRole('navigation', { name: 'Dashboard' })).not.toBeInTheDocument();
    });

    it('keeps the logo in the top bar, top left, on those pages too', async () => {
      signInAs(USER_ROLES.RENTER);
      renderWithProviders(<App />, { route: '/vehicles' });
      await screen.findByRole('navigation', { name: 'Dashboard' });
      const header = screen.getByRole('banner');
      expect(within(header).getByText('RAMELLIAN').closest('a')).toHaveAttribute('href', '/');
      expect(within(screen.getByRole('navigation', { name: 'Dashboard' }).closest('aside')).queryByText('RAMELLIAN')).not.toBeInTheDocument();
    });
  });

  it("gives a car owner Add Vehicle, My Vehicles and Profile in the left menu", async () => {
    signInAs(USER_ROLES.OWNER);
    renderWithProviders(<App />, { route: '/owner' });
    const menu = await screen.findByRole('navigation', { name: 'Dashboard' });

    expect(within(menu).getByRole('link', { name: 'Add Vehicle' })).toHaveAttribute('href', '/owner/vehicles/new');
    expect(within(menu).getByRole('link', { name: 'My Vehicles' })).toHaveAttribute('href', '/owner/vehicles');
    expect(within(menu).getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/dashboard/profile');
  });

  it("gives an administrator Profile as well as Add Vehicle in the left menu", async () => {
    signInAs(USER_ROLES.ADMIN);
    renderWithProviders(<App />, { route: '/admin' });
    const menu = await screen.findByRole('navigation', { name: 'Dashboard' });

    expect(within(menu).getByRole('link', { name: 'Add Vehicle' })).toHaveAttribute('href', '/admin/vehicles/new');
    expect(within(menu).getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/dashboard/profile');
  });

  it('renders the real dashboard at "/dashboard" when authenticated', async () => {
    signInAs(USER_ROLES.RENTER);
    renderWithProviders(<App />, { route: '/dashboard' });
    expect(await screen.findByRole('heading', { name: /welcome, test/i })).toBeInTheDocument();
  });

  it('sends a signed-out visitor from "/owner" to the main page', async () => {
    renderWithProviders(<App />, { route: '/owner' });
    expect(await screen.findByRole('heading', { name: /executive travel, reimagined/i })).toBeInTheDocument();
  });

  it('lets a renter reach the owner onboarding at "/owner" (self-service path to the Owner role)', async () => {
    signInAs(USER_ROLES.RENTER);
    renderWithProviders(<App />, { route: '/owner' });
    expect(await screen.findByRole('heading', { name: /let's get your fleet set up/i })).toBeInTheDocument();
  });

  it('redirects a renter away from "/owner/bookings" (still requires the Owner/Manager role)', async () => {
    signInAs(USER_ROLES.RENTER);
    renderWithProviders(<App />, { route: '/owner/bookings' });
    expect(await screen.findByRole('heading', { name: /welcome, test/i })).toBeInTheDocument();
  });

  it('renders the real owner dashboard at "/owner" for an owner', async () => {
    signInAs(USER_ROLES.OWNER);
    renderWithProviders(<App />, { route: '/owner' });
    expect(await screen.findByRole('heading', { name: /let's get your fleet set up/i })).toBeInTheDocument();
  });

  it('renders the real admin dashboard at "/admin" for an admin', async () => {
    signInAs(USER_ROLES.ADMIN);
    renderWithProviders(<App />, { route: '/admin' });
    expect(await screen.findByRole('heading', { name: /admin overview/i })).toBeInTheDocument();
  });

  it('redirects a non-admin away from "/admin"', async () => {
    signInAs(USER_ROLES.OWNER);
    renderWithProviders(<App />, { route: '/admin' });
    await screen.findByRole('heading', { name: /welcome, test/i });
    expect(screen.queryByRole('heading', { name: /admin overview/i })).not.toBeInTheDocument();
  });

  it('renders the 404 page for unknown routes', async () => {
    renderWithProviders(<App />, { route: '/this-does-not-exist' });
    expect(await screen.findByRole('heading', { level: 1, name: /page not found/i })).toBeInTheDocument();
  });

  it('renders the real services page at "/services"', async () => {
    renderWithProviders(<App />, { route: '/services' });
    expect(await screen.findByRole('heading', { name: /our services/i })).toBeInTheDocument();
  });

  it('renders the real fleet page at "/fleet"', async () => {
    renderWithProviders(<App />, { route: '/fleet' });
    expect(await screen.findByRole('heading', { name: /our fleet/i })).toBeInTheDocument();
  });

  it('renders the real about page at "/about"', async () => {
    renderWithProviders(<App />, { route: '/about' });
    expect(await screen.findByRole('heading', { name: /our story/i })).toBeInTheDocument();
  });

  it('renders the real contact page at "/contact"', async () => {
    renderWithProviders(<App />, { route: '/contact' });
    expect(await screen.findByRole('heading', { name: /contact us/i })).toBeInTheDocument();
  });

  it('renders the real FAQ page at "/faq"', async () => {
    renderWithProviders(<App />, { route: '/faq' });
    expect(await screen.findByRole('heading', { name: /frequently asked questions/i })).toBeInTheDocument();
  });

  it('renders the real vehicle detail page (loading state) with a vehicleId param', async () => {
    renderWithProviders(<App />, { route: '/vehicles/v123' });
    expect(await screen.findByRole('status', { name: /loading vehicle/i })).toBeInTheDocument();
  });

  it('opens the booking basket for a visitor, with no account needed', async () => {
    renderWithProviders(<App />, { route: '/booking' });
    expect(await screen.findByText(/you haven't chosen a vehicle yet/i)).toBeInTheDocument();
  });

  it('sends the old booking-wizard address to the vehicle page (loading state)', async () => {
    renderWithProviders(<App />, { route: '/book/v123' });
    expect(await screen.findByRole('status', { name: /loading vehicle/i })).toBeInTheDocument();
  });
});
