// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { axe } from 'jest-axe';
import { Toaster } from 'react-hot-toast';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import AdminRolesPage from './AdminRolesPage';
import AdminUserDetailPage from './AdminUserDetailPage';
import EditUserModal from '../components/admin/EditUserModal';
import Pagination, { pageWindow } from '../components/ui/Pagination';
import { groupPermissions, permissionAction, permissionGroup, roleTitle } from '../lib/rolesPermissions';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

const PERMS = ['VEHICLE_CREATE', 'VEHICLE_APPROVE', 'BOOKING_READ', 'USER_MANAGE'].map((permissionName, i) => ({
  id: `p-${i}`, permissionName, description: i === 0 ? 'Add vehicles' : null,
}));
const ROLES = [
  { id: 'r-1', roleName: 'SUPER_ADMIN', description: 'Everything', permissions: ['VEHICLE_CREATE', 'VEHICLE_APPROVE', 'BOOKING_READ', 'USER_MANAGE'] },
  { id: 'r-2', roleName: 'CAR_OWNER', description: null, permissions: ['VEHICLE_CREATE'] },
  { id: 'r-3', roleName: 'FLEET_SUPERVISOR', description: 'Watches the fleet', permissions: ['BOOKING_READ'] },
];

function renderUi(element, route = '/admin/roles') {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <Toaster />
        <MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  act(() => useAuthStore.setState({ token: 't', user: { id: 'me-1', email: 'felix@example.com', roles: ['ADMIN'] } }));
  server.use(
    http.get(`${BASE}/roles`, () => HttpResponse.json(ROLES)),
    http.get(`${BASE}/permissions`, () => HttpResponse.json(PERMS))
  );
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null, mode: null }));
});

describe('role and permission helpers', () => {
  it('names a role for people', () => {
    expect(roleTitle('SUPER_ADMIN')).toBe('Super Admin');
    expect(roleTitle('FLEET_SUPERVISOR')).toBe('Fleet supervisor');
  });

  it('groups permissions by what they are about, and names the action', () => {
    expect(permissionGroup('VEHICLE_APPROVE')).toBe('VEHICLE');
    expect(permissionGroup('ODDNAME')).toBe('OTHER');
    expect(permissionAction('VEHICLE_APPROVE')).toBe('Approve');
    expect(groupPermissions(['VEHICLE_CREATE', 'BOOKING_READ', 'VEHICLE_APPROVE', 'BOOKING_READ'])).toEqual([
      { group: 'BOOKING', names: ['BOOKING_READ'] },
      { group: 'VEHICLE', names: ['VEHICLE_APPROVE', 'VEHICLE_CREATE'] },
    ]);
  });
});

describe('Roles tab', () => {
  it('lists the roles with what they can do, marking the built-in ones', async () => {
    renderUi(<AdminRolesPage />);
    const owner = (await screen.findByRole('heading', { name: 'Car Owner' })).closest('li');
    expect(within(owner).getByText('Built in')).toBeInTheDocument();
    expect(within(owner).getByText('1 permission')).toBeInTheDocument();
    expect(within(owner).getByText('VEHICLE_CREATE')).toBeInTheDocument();
    const custom = screen.getByRole('heading', { name: 'Fleet supervisor' }).closest('li');
    expect(within(custom).queryByText('Built in')).not.toBeInTheDocument();
    expect(within(custom).getByText('Watches the fleet')).toBeInTheDocument();
  });

  it('searches roles', async () => {
    const user = userEvent.setup();
    renderUi(<AdminRolesPage />);
    await screen.findByRole('heading', { name: 'Car Owner' });
    await user.type(screen.getByLabelText('Search'), 'supervisor');
    expect(screen.queryByRole('heading', { name: 'Car Owner' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fleet supervisor' })).toBeInTheDocument();
  });

  it('edits the permissions of a role with PUT /roles/{name}, sending the whole set and the description', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/roles/FLEET_SUPERVISOR`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...ROLES[2], ...body });
      })
    );
    renderUi(<AdminRolesPage />);
    await user.click(await screen.findByRole('button', { name: 'Edit role Fleet supervisor' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('checkbox', { name: 'BOOKING_READ' })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'VEHICLE_CREATE' })).not.toBeChecked();
    await user.click(within(dialog).getByRole('checkbox', { name: 'VEHICLE_CREATE' }));
    await user.click(within(dialog).getByRole('checkbox', { name: 'BOOKING_READ' })); // and take one away
    await user.click(within(dialog).getByRole('button', { name: 'Save role' }));
    await waitFor(() => expect(body).toEqual({ description: 'Watches the fleet', permissions: ['VEHICLE_CREATE'] }));
  });

  it('selects a whole group at once, and shows a group as partly chosen', async () => {
    const user = userEvent.setup();
    renderUi(<AdminRolesPage />);
    await user.click(await screen.findByRole('button', { name: 'Edit role Car Owner' }));
    const dialog = await screen.findByRole('dialog');
    const vehicles = within(dialog).getByRole('checkbox', { name: 'All VEHICLE permissions' });
    expect(vehicles.indeterminate).toBe(true); // CREATE chosen, APPROVE not
    await user.click(vehicles);
    expect(within(dialog).getByRole('checkbox', { name: 'VEHICLE_APPROVE' })).toBeChecked();
    expect(vehicles.indeterminate).toBe(false);
    expect(within(dialog).getByText('2 chosen')).toBeInTheDocument();
    await user.click(vehicles);
    expect(within(dialog).getByRole('checkbox', { name: 'VEHICLE_CREATE' })).not.toBeChecked();
  });

  it('warns that a built-in role is relied on, and that a change reaches people at their next login', async () => {
    const user = userEvent.setup();
    renderUi(<AdminRolesPage />);
    await user.click(await screen.findByRole('button', { name: 'Edit role Super Admin' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('note')).toHaveTextContent(/built-in role the portal relies on/i);
    expect(screen.getByText(/next time they log in/i)).toBeInTheDocument();
  });

  it('creates a role with POST /roles', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/roles`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'r-9', ...body }, { status: 201 });
      })
    );
    renderUi(<AdminRolesPage />);
    await user.click(await screen.findByRole('button', { name: 'New role' }));
    const dialog = await screen.findByRole('dialog');
    const create = within(dialog).getByRole('button', { name: 'Create role' });
    expect(create).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Role name'), 'AUDITOR');
    await user.type(within(dialog).getByLabelText(/description/i), 'Reads everything');
    await user.click(await within(dialog).findByRole('checkbox', { name: 'BOOKING_READ' }));
    await user.click(create);
    await waitFor(() => expect(body).toEqual({ roleName: 'AUDITOR', description: 'Reads everything', permissions: ['BOOKING_READ'] }));
  });

  it("shows the backend's reason when a role can't be saved", async () => {
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/roles`, () => HttpResponse.json({ message: 'Role already exists' }, { status: 409 })));
    renderUi(<AdminRolesPage />);
    await user.click(await screen.findByRole('button', { name: 'New role' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Role name'), 'CAR_OWNER');
    await user.click(within(dialog).getByRole('button', { name: 'Create role' }));
    expect(await screen.findByText(/role already exists/i)).toBeInTheDocument();
  });

  it('asks before deleting a role, then deletes it with DELETE /roles/{name}', async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(http.delete(`${BASE}/roles/FLEET_SUPERVISOR`, () => { deleted = true; return new HttpResponse(null, { status: 204 }); }));
    renderUi(<AdminRolesPage />);
    await user.click(await screen.findByRole('button', { name: 'Delete role Fleet supervisor' }));
    const dialog = await screen.findByRole('dialog');
    expect(deleted).toBe(false);
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleted).toBe(true));
  });

  it('warns strongly before deleting a built-in role', async () => {
    const user = userEvent.setup();
    renderUi(<AdminRolesPage />);
    await user.click(await screen.findByRole('button', { name: 'Delete role Super Admin' }));
    expect(await within(await screen.findByRole('dialog')).findByRole('alert')).toHaveTextContent(/lock people out/i);
  });

  it('says so when the roles cannot be loaded (the login is being refused)', async () => {
    server.use(http.get(`${BASE}/roles`, () => new HttpResponse(null, { status: 403 })));
    renderUi(<AdminRolesPage />);
    expect(await screen.findByText(/couldn't load the roles/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderUi(<AdminRolesPage />);
    await screen.findByRole('heading', { name: 'Car Owner' });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Permissions tab', () => {
  async function openTab(user) {
    await screen.findByRole('heading', { name: 'Car Owner' });
    await user.click(screen.getByRole('tab', { name: 'Permissions' }));
  }

  it('lists every permission with what it allows', async () => {
    const user = userEvent.setup();
    renderUi(<AdminRolesPage />);
    await openTab(user);
    const row = (await screen.findByText('VEHICLE_CREATE')).closest('tr');
    expect(within(row).getByText('Add vehicles')).toBeInTheDocument();
    expect(screen.getByText('BOOKING_READ')).toBeInTheDocument();
  });

  it('pages through a long list, ten to a page', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 25 }, (_, i) => ({ id: `x-${i}`, permissionName: `THING_${String(i).padStart(2, '0')}`, description: null }));
    server.use(http.get(`${BASE}/permissions`, () => HttpResponse.json(many)));
    renderUi(<AdminRolesPage />);
    await openTab(user);
    await screen.findByText('THING_00');
    expect(screen.getAllByRole('row')).toHaveLength(11); // header + 10
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Showing 1–10 of 25 permissions');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('THING_10')).toBeInTheDocument();
    expect(screen.queryByText('THING_00')).not.toBeInTheDocument();
  });

  it('searches permissions', async () => {
    const user = userEvent.setup();
    renderUi(<AdminRolesPage />);
    await openTab(user);
    await screen.findByText('VEHICLE_CREATE');
    await user.type(screen.getByLabelText('Search'), 'booking');
    expect(screen.queryByText('VEHICLE_CREATE')).not.toBeInTheDocument();
    expect(screen.getByText('BOOKING_READ')).toBeInTheDocument();
  });

  it('creates a permission with POST /permissions', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/permissions`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'p-9', ...body }, { status: 201 });
      })
    );
    renderUi(<AdminRolesPage />);
    await openTab(user);
    await user.click(screen.getByRole('button', { name: 'New permission' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Permission name'), 'REPORT_EXPORT');
    await user.type(within(dialog).getByLabelText(/what it allows/i), 'Download reports');
    await user.click(within(dialog).getByRole('button', { name: 'Create permission' }));
    await waitFor(() => expect(body).toEqual({ permissionName: 'REPORT_EXPORT', description: 'Download reports' }));
  });

  it('edits a permission with PUT /permissions/{name}', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/permissions/BOOKING_READ`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'p-2', ...body });
      })
    );
    renderUi(<AdminRolesPage />);
    await openTab(user);
    await user.click(await screen.findByRole('button', { name: 'Edit permission BOOKING_READ' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/what it allows/i), 'See bookings');
    await user.click(within(dialog).getByRole('button', { name: 'Save permission' }));
    await waitFor(() => expect(body).toEqual({ permissionName: 'BOOKING_READ', description: 'See bookings' }));
  });

  it('deletes a permission after asking, with DELETE /permissions/{name}', async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(http.delete(`${BASE}/permissions/USER_MANAGE`, () => { deleted = true; return new HttpResponse(null, { status: 204 }); }));
    renderUi(<AdminRolesPage />);
    await openTab(user);
    await user.click(await screen.findByRole('button', { name: 'Delete permission USER_MANAGE' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/roles that have this permission will lose it/i)).toBeInTheDocument();
    expect(deleted).toBe(false);
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleted).toBe(true));
  });
});

describe('roles in the user editor and on the user page', () => {
  const ANN = { id: 'u-2', email: 'ann@example.com', firstName: 'Ann', lastName: 'Renter', enabled: true, roles: [] };

  it('the editor offers the roles that exist, including custom ones', async () => {
    renderUi(<EditUserModal user={ANN} onClose={() => {}} />, '/');
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('radio', { name: /fleet supervisor/i })).toBeInTheDocument();
    expect(within(dialog).getByText('Watches the fleet')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Roles & Permissions' })).toHaveAttribute('href', '/admin/roles');
  });

  it('falls back to the portal’s own list when the roles cannot be read', async () => {
    server.use(http.get(`${BASE}/roles`, () => new HttpResponse(null, { status: 403 })));
    renderUi(<EditUserModal user={ANN} onClose={() => {}} />, '/');
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('radio', { name: /car owner/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('radio', { name: /fleet supervisor/i })).not.toBeInTheDocument();
  });

  it('gives a role by its real name with PUT /users/admin/{id}/role', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/users/admin/u-2/role`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...ANN, roles: ['FLEET_SUPERVISOR'] });
      })
    );
    renderUi(<EditUserModal user={ANN} onClose={() => {}} />, '/');
    await user.click(await screen.findByRole('radio', { name: /fleet supervisor/i }));
    await user.click(screen.getByRole('button', { name: 'Save role' }));
    await waitFor(() => expect(body).toEqual({ role: 'FLEET_SUPERVISOR' }));
  });

  it("a user's page lists the permissions they have, and any given directly", async () => {
    server.use(
      http.get(`${BASE}/users/admin/u-2`, () =>
        HttpResponse.json({ ...ANN, permissions: ['VEHICLE_CREATE', 'BOOKING_READ'], directPermissions: ['BOOKING_READ'] })
      )
    );
    renderUi(
      <Routes>
        <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
      </Routes>,
      '/admin/users/u-2'
    );
    const list = await screen.findByRole('list', { name: 'Permissions this person has' });
    expect(within(list).getByText('VEHICLE_CREATE')).toBeInTheDocument();
    expect(screen.getByText(/given to them directly/i)).toHaveTextContent('BOOKING_READ');
  });
});

describe('Pagination', () => {
  const setup = (props) => renderUi(<Pagination page={1} totalPages={5} onPage={() => {}} from={1} to={10} total={48} noun="things" {...props} />, '/');

  it('renders nothing when there is one page', () => {
    setup({ totalPages: 1 });
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  it('says where you are and marks the current page', () => {
    setup({ page: 2, from: 11, to: 20 });
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Showing 11–20 of 48 things');
    expect(screen.getByLabelText('Page 2, current page')).toHaveAttribute('aria-current', 'page');
  });

  it('calls back with the page asked for', async () => {
    const user = userEvent.setup();
    const seen = [];
    setup({ page: 2, onPage: (n) => seen.push(n) });
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    await user.click(screen.getByRole('button', { name: 'Go to page 5' }));
    expect(seen).toEqual([3, 1, 5]);
  });

  it('shows the first, last and neighbouring pages with a gap between', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(2, 10)).toEqual([1, 2, 3, null, 10]);
  });
});

describe('the permission grid', () => {
  // Shaped like the live list: the standard actions for most areas, plus some that are not.
  const NAMES = [
    'BOOKING_CREATE', 'BOOKING_READ', 'BOOKING_UPDATE', 'BOOKING_DELETE', 'BOOKING_MANAGE',
    'VEHICLE_READ', 'VEHICLE_CREATE', 'VEHICLE_APPROVE', 'VEHICLE_REVIEW',
    'DOCUMENT_READ', 'DOCUMENT_UPLOAD', 'DOCUMENT_REVIEW',
    'AUDIT_READ',
  ];
  const LIVE_PERMS = NAMES.map((permissionName, i) => ({ id: `g-${i}`, permissionName, description: null }));

  async function openGrid(user, chosen = []) {
    server.use(
      http.get(`${BASE}/permissions`, () => HttpResponse.json(LIVE_PERMS)),
      http.get(`${BASE}/roles`, () => HttpResponse.json([{ id: 'r-9', roleName: 'AUDITOR', description: '', permissions: chosen }]))
    );
    renderUi(<AdminRolesPage />);
    await user.click(await screen.findByRole('button', { name: 'Edit role Auditor' }));
    return within(await screen.findByRole('dialog'));
  }

  it('is one card per area, not one long list', async () => {
    const dialog = await openGrid(userEvent.setup());
    for (const area of ['BOOKING', 'VEHICLE', 'DOCUMENT', 'AUDIT']) {
      expect(dialog.getByRole('group', { name: area })).toBeInTheDocument();
    }
    expect(dialog.getByText('Quick pick')).toBeInTheDocument();
    expect(dialog.getByRole('checkbox', { name: 'All READ permissions' })).toBeInTheDocument();
    expect(dialog.getByRole('checkbox', { name: 'All MANAGE permissions' })).toBeInTheDocument();
  });

  it('lists the standard actions first on a card, and the others (Approve, Review, Upload) after them', async () => {
    const dialog = await openGrid(userEvent.setup());
    const vehicles = within(dialog.getByRole('group', { name: 'VEHICLE' }));
    expect(vehicles.getByRole('checkbox', { name: 'VEHICLE_APPROVE' })).toBeInTheDocument();
    expect(vehicles.getByText('Approve')).toBeInTheDocument();
    expect(vehicles.getByText('Review')).toBeInTheDocument();
    const order = vehicles.getAllByRole('checkbox').map((box) => box.getAttribute('aria-label'));
    expect(order.indexOf('VEHICLE_READ')).toBeLessThan(order.indexOf('VEHICLE_APPROVE'));
    expect(order.indexOf('VEHICLE_CREATE')).toBeLessThan(order.indexOf('VEHICLE_REVIEW'));
    expect(within(dialog.getByRole('group', { name: 'DOCUMENT' })).getByText('Upload')).toBeInTheDocument();
  });

  it('only offers the actions an area really has', async () => {
    const dialog = await openGrid(userEvent.setup());
    const audit = within(dialog.getByRole('group', { name: 'AUDIT' }));
    expect(audit.getAllByRole('checkbox')).toHaveLength(2); // "Select all" and AUDIT_READ
  });

  it('shows how much of an area is chosen', async () => {
    const dialog = await openGrid(userEvent.setup(), ['VEHICLE_READ']);
    expect(within(dialog.getByRole('group', { name: 'VEHICLE' })).getByText('1/4')).toBeInTheDocument();
    expect(within(dialog.getByRole('group', { name: 'BOOKING' })).getByText('0/5')).toBeInTheDocument();
  });

  it('clears everything with "Clear all", which only appears once something is chosen', async () => {
    const user = userEvent.setup();
    const dialog = await openGrid(user);
    expect(dialog.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
    await user.click(dialog.getByRole('checkbox', { name: 'BOOKING_READ' }));
    expect(dialog.getByText('1 chosen')).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Clear all' }));
    expect(dialog.getByText('0 chosen')).toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: 'Clear all' })).not.toBeInTheDocument();
  });

  it('picks an action everywhere with its Quick pick pill, and shows it as partly chosen', async () => {
    const user = userEvent.setup();
    const dialog = await openGrid(user, ['BOOKING_READ']);
    const readColumn = dialog.getByRole('checkbox', { name: 'All READ permissions' });
    expect(readColumn.indeterminate).toBe(true); // one of four READ permissions
    await user.click(readColumn);
    for (const name of ['BOOKING_READ', 'VEHICLE_READ', 'DOCUMENT_READ', 'AUDIT_READ']) {
      expect(dialog.getByRole('checkbox', { name })).toBeChecked();
    }
    expect(dialog.getByRole('checkbox', { name: 'BOOKING_CREATE' })).not.toBeChecked();
    await user.click(readColumn);
    expect(dialog.getByRole('checkbox', { name: 'VEHICLE_READ' })).not.toBeChecked();
  });

  it('picks a whole area with the button on its card', async () => {
    const user = userEvent.setup();
    const dialog = await openGrid(user);
    await user.click(dialog.getByRole('checkbox', { name: 'All VEHICLE permissions' }));
    for (const name of ['VEHICLE_READ', 'VEHICLE_CREATE', 'VEHICLE_APPROVE', 'VEHICLE_REVIEW']) {
      expect(dialog.getByRole('checkbox', { name })).toBeChecked();
    }
    expect(dialog.getByText('4 chosen')).toBeInTheDocument();
  });

  it('saves exactly what the grid shows', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/roles/AUDITOR`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'r-9', roleName: 'AUDITOR', ...body });
      })
    );
    const dialog = await openGrid(user);
    await user.click(dialog.getByRole('checkbox', { name: 'All READ permissions' }));
    await user.click(dialog.getByRole('checkbox', { name: 'VEHICLE_APPROVE' }));
    await user.click(dialog.getByRole('button', { name: 'Save role' }));
    await waitFor(() => expect(body.permissions.sort()).toEqual(['AUDIT_READ', 'BOOKING_READ', 'DOCUMENT_READ', 'VEHICLE_APPROVE', 'VEHICLE_READ']));
  });

  it('has the Save button in a pinned footer, and no accessibility violations', async () => {
    const dialog = await openGrid(userEvent.setup());
    const footer = dialog.getByRole('button', { name: 'Save role' }).parentElement;
    expect(footer.className).toMatch(/sticky/);
    expect(await axe(screen.getByRole('dialog'))).toHaveNoViolations();
  });
});
