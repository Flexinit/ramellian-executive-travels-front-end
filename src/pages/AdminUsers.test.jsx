// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { axe } from 'jest-axe';
import { Toaster } from 'react-hot-toast';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import AdminUsersPage from './AdminUsersPage';
import AdminUserDetailPage from './AdminUserDetailPage';

const BASE = 'http://192.168.8.11:8080/api/v1';

// Shaped like the live `GET /users/admin` answer: a super admin who owns cars, and a plain renter with no roles.
const FELIX = {
  id: 'me-1', email: 'felix@example.com', firstName: 'Felix', lastName: 'Admin', enabled: true,
  roles: ['SUPER_ADMIN', 'CAR_OWNER'], emailVerified: true, twoFactorEnabled: false, hasCompletedProfile: false,
  isCarOwner: true, hasAddedVehicleToProfile: true, phoneNumber: '0700000000', location: 'Roysambu', ownerType: 'INDIVIDUAL',
};
const ANN = {
  id: 'u-2', email: 'ann@example.com', firstName: 'Ann', lastName: 'Renter', enabled: true, roles: [],
  emailVerified: true, twoFactorEnabled: false, hasCompletedProfile: false, isCarOwner: false, idNumber: '233433',
};

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderAt(route) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <Toaster />
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  // The toast container (used here to read the backend's error messages) asks the browser about reduced motion; jsdom has no matchMedia.
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  act(() => useAuthStore.setState({ token: 't', user: { id: 'me-1', email: 'felix@example.com', roles: ['ADMIN'] } }));
  server.use(
    http.get(`${BASE}/users/admin`, () => HttpResponse.json([FELIX, ANN])),
    http.get(`${BASE}/users/admin/me-1`, () => HttpResponse.json(FELIX)),
    http.get(`${BASE}/users/admin/u-2`, () => HttpResponse.json(ANN))
  );
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null, mode: null }));
});

describe('AdminUsersPage', () => {
  it('lists every account with its roles — a renter with no roles reads as Car Renter — and its status', async () => {
    renderAt('/admin/users');
    const felix = await screen.findByRole('row', { name: /open felix admin/i });
    expect(within(felix).getByText('Super Admin')).toBeInTheDocument();
    expect(within(felix).getByText('Car Owner')).toBeInTheDocument();
    const ann = screen.getByRole('row', { name: /open ann renter/i });
    expect(within(ann).getByText('Car Renter')).toBeInTheDocument();
    expect(within(ann).getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('2 of 2 accounts')).toBeInTheDocument();
  });

  it('shows a disabled account as Disabled', async () => {
    server.use(http.get(`${BASE}/users/admin`, () => HttpResponse.json([{ ...ANN, enabled: false }])));
    renderAt('/admin/users');
    expect(await screen.findByText('Disabled')).toBeInTheDocument();
  });

  it('searches by name or email', async () => {
    const user = userEvent.setup();
    renderAt('/admin/users');
    await screen.findByRole('row', { name: /open ann renter/i });
    await user.type(screen.getByLabelText('Search'), 'ann@');
    expect(screen.queryByRole('row', { name: /open felix admin/i })).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /open ann renter/i })).toBeInTheDocument();
    expect(screen.getByText('1 of 2 accounts')).toBeInTheDocument();
  });

  it('filters by role, and Car Renter includes accounts with no role at all', async () => {
    const user = userEvent.setup();
    renderAt('/admin/users');
    await screen.findByRole('row', { name: /open ann renter/i });
    await user.selectOptions(screen.getByLabelText('Role'), 'CAR_RENTER');
    expect(screen.getByRole('row', { name: /open ann renter/i })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /open felix admin/i })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Role'), 'SUPER_ADMIN');
    expect(screen.getByRole('row', { name: /open felix admin/i })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /open ann renter/i })).not.toBeInTheDocument();
  });

  it('has an Edit button on every row that opens the editor without opening the account', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/users/admin/u-2/role`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...ANN, roles: ['MANAGE'] });
      })
    );
    renderAt('/admin/users');
    await user.click(await screen.findByRole('button', { name: 'Edit Ann Renter' }));
    const dialog = await screen.findByRole('dialog', { name: /edit user/i });
    expect(within(dialog).getByText('Ann Renter')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument(); // still on the list
    await user.click(within(dialog).getByRole('radio', { name: /fleet manager/i }));
    await user.click(within(dialog).getByRole('button', { name: 'Save role' }));
    await waitFor(() => expect(body).toEqual({ role: 'MANAGE' }));
  });

  it('the editor can also switch the account off, straight away (PUT /users/admin/{id}/enabled)', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/users/admin/u-2/enabled`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...ANN, enabled: false });
      })
    );
    renderAt('/admin/users');
    await user.click(await screen.findByRole('button', { name: 'Edit Ann Renter' }));
    const dialog = await screen.findByRole('dialog');
    const active = within(dialog).getByRole('switch', { name: 'Account active' });
    expect(active).toHaveAttribute('aria-checked', 'true');
    await user.click(active);
    await waitFor(() => expect(body).toEqual({ enabled: false }));
    expect(active).toHaveAttribute('aria-checked', 'false');
  });

  it('the editor says permissions come with the role, and that personal details are the person’s own to change', async () => {
    const user = userEvent.setup();
    renderAt('/admin/users');
    await user.click(await screen.findByRole('button', { name: 'Edit Ann Renter' }));
    const dialog = await screen.findByRole('dialog');
    const note = within(dialog).getByRole('note');
    expect(note).toHaveTextContent(/permissions come with the role/i);
    expect(note).toHaveTextContent(/only be changed by the person themselves/i);
    expect(within(dialog).queryByRole('link', { name: 'Edit my details' })).not.toBeInTheDocument();
  });

  it("can't switch the administrator's own account off, and links to their own details instead", async () => {
    const user = userEvent.setup();
    renderAt('/admin/users');
    await user.click(await screen.findByRole('button', { name: 'Edit Felix Admin' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('switch', { name: 'Account active' })).toBeDisabled();
    expect(within(dialog).getByRole('link', { name: 'Edit my details' })).toHaveAttribute('href', '/dashboard/profile');
  });

  it('opens an account when its row is clicked', async () => {
    const user = userEvent.setup();
    renderAt('/admin/users');
    await user.click(await screen.findByRole('row', { name: /open ann renter/i }));
    expect(await screen.findByRole('heading', { name: 'Ann Renter' })).toBeInTheDocument();
  });

  it('shows an error with a retry when the accounts cannot be loaded', async () => {
    server.use(http.get(`${BASE}/users/admin`, () => new HttpResponse(null, { status: 500 })));
    renderAt('/admin/users');
    expect(await screen.findByText(/couldn't load the accounts/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderAt('/admin/users');
    await screen.findByRole('row', { name: /open ann renter/i });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('AdminUserDetailPage', () => {
  it("shows the account's details, leaving out the fields it doesn't have", async () => {
    renderAt('/admin/users/u-2');
    expect(await screen.findByRole('heading', { name: 'Ann Renter' })).toBeInTheDocument();
    expect(screen.getByText('ann@example.com')).toBeInTheDocument();
    expect(screen.getByText('233433')).toBeInTheDocument();
    expect(screen.queryByText('Business name')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderAt('/admin/users/me-1');
    await screen.findByRole('heading', { name: 'Felix Admin' });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('disables an account with PUT /users/admin/{id}/enabled', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/users/admin/u-2/enabled`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...ANN, enabled: false });
      })
    );
    renderAt('/admin/users/u-2');
    await user.click(await screen.findByRole('button', { name: 'Disable account' }));
    await waitFor(() => expect(body).toEqual({ enabled: false }));
  });

  it('enables a disabled account', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.get(`${BASE}/users/admin/u-2`, () => HttpResponse.json({ ...ANN, enabled: false })),
      http.put(`${BASE}/users/admin/u-2/enabled`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(ANN);
      })
    );
    renderAt('/admin/users/u-2');
    await user.click(await screen.findByRole('button', { name: 'Enable account' }));
    await waitFor(() => expect(body).toEqual({ enabled: true }));
  });

  it('edits roles from the header: pick a role card, Save role sends PUT /users/admin/{id}/role with the backend name', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/users/admin/u-2/role`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...ANN, roles: ['CAR_OWNER'] });
      })
    );
    renderAt('/admin/users/u-2');
    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    const save = within(dialog).getByRole('button', { name: 'Save role' });
    expect(save).toBeDisabled();
    await user.click(within(dialog).getByRole('radio', { name: /car owner/i }));
    await user.click(save);
    await waitFor(() => expect(body).toEqual({ role: 'CAR_OWNER' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it("shows the backend's own message when a role is refused, and keeps the dialog open", async () => {
    const user = userEvent.setup();
    server.use(http.put(`${BASE}/users/admin/u-2/role`, () => HttpResponse.json({ message: 'Unknown role: ADMIN' }, { status: 400 })));
    renderAt('/admin/users/u-2');
    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('radio', { name: /^administrator/i }));
    await user.click(within(dialog).getByRole('button', { name: 'Save role' }));
    expect(await screen.findByText(/unknown role: admin/i)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('is laid out in a header, at-a-glance facts and grouped cards', async () => {
    renderAt('/admin/users/me-1');
    expect(await screen.findByRole('heading', { name: 'Felix Admin' })).toBeInTheDocument();
    const glance = screen.getByLabelText('At a glance');
    expect(within(glance).getByText('Verified')).toBeInTheDocument();
    expect(within(glance).getByText('Not completed')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByText('0700000000')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Business' })).not.toBeInTheDocument();
  });

  it('says where identity documents are reviewed when the profile has no ID pictures', async () => {
    renderAt('/admin/users/u-2');
    expect(await screen.findByText(/no identity pictures are attached/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review Documents' })).toHaveAttribute('href', '/admin/documents');
  });

  it('shows ID pictures from the profile as previews', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    server.use(http.get(`${BASE}/users/admin/u-2`, () => HttpResponse.json({ ...ANN, idNumberUrlFront: png, idNumberUrlBack: png })));
    renderAt('/admin/users/u-2');
    expect(await screen.findByRole('button', { name: 'Open ID — front full size' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open ID — back full size' })).toBeInTheDocument();
  });

  it('asks before deleting, then deletes with DELETE /users/admin/{id} and returns to the list', async () => {
    const user = userEvent.setup();
    let deleted = false;
    server.use(
      http.delete(`${BASE}/users/admin/u-2`, () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      })
    );
    renderAt('/admin/users/u-2');
    await user.click(await screen.findByRole('button', { name: 'Delete account' }));
    expect(deleted).toBe(false);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleted).toBe(true));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument());
  });

  it("can't disable or delete the administrator's own account", async () => {
    renderAt('/admin/users/me-1');
    expect(await screen.findByRole('button', { name: 'Disable account' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete account' })).toBeDisabled();
    expect(screen.getByText(/you can't disable or delete it/i)).toBeInTheDocument();
  });

  it('shows an error when the account cannot be loaded', async () => {
    server.use(http.get(`${BASE}/users/admin/u-2`, () => HttpResponse.json({ message: 'User not found' }, { status: 404 })));
    renderAt('/admin/users/u-2');
    expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
  });
});
