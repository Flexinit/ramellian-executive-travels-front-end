// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
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
import AdminVehicleApprovalsPage from './AdminVehicleApprovalsPage';
import AdminVehiclesPage from './AdminVehiclesPage';
import EditVehiclePage from './EditVehiclePage';
import OwnerVehicleCard from '../components/vehicles/OwnerVehicleCard';
import { approvalLabel, approvalOf, matchesApprovalFilter, needsReview } from '../lib/vehicleApproval';
import { scanSticker } from '../lib/qrScan';

vi.mock('../lib/qrScan', async (importOriginal) => ({ ...(await importOriginal()), scanSticker: vi.fn() }));

const BASE = 'http://192.168.8.11:8080/api/v1';
const pixel = 'data:image/png;base64,iVBORw0KGgo=';

// Shaped like the live `GET /vehicles/admin/all`: a listing waiting, one from before approval existed (all null), one
// approved, one rejected.
const CAR = {
  location: 'Nairobi', pricePerDay: 9000, capacity: 5, color: 'White', fuelType: 'DIESEL', transmissionType: 'AUTOMATIC', vin: 'VIN1',
  selfDrive: true, chauffeured: false, hasWorkingAC: true, comprehensiveInsurance: true, insuranceVerificationStickerPhoto: pixel,
  ownerEmail: 'owner@example.com', available: true, approvalNotes: null, reviewedBy: null, reviewedAt: null,
};
const PENDING = { ...CAR, id: 'v-new', model: 'New Prado', registrationNumber: 'KAA 111A', approvalStatus: 'PENDING' };
const LEGACY = { ...CAR, id: 'v-old', model: 'Old Touran', registrationNumber: 'KBB 222B', approvalStatus: null, insuranceVerificationStickerPhoto: null };
const APPROVED = { ...CAR, id: 'v-ok', model: 'Good Noah', registrationNumber: 'KCC 333C', approvalStatus: 'APPROVED', reviewedBy: 'felix@example.com', reviewedAt: '2026-09-24T10:00:00Z' };
const REJECTED = { ...CAR, id: 'v-no', model: 'Bad Voxy', registrationNumber: 'KDD 444D', approvalStatus: 'REJECTED', approvalNotes: 'Sticker unreadable' };

function renderUi(element, route = '/') {
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
  scanSticker.mockReset();
  scanSticker.mockResolvedValue('https://dmvic.com/verify?c=1');
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  act(() => useAuthStore.setState({ token: 't', user: { id: 'me-1', email: 'felix@example.com', roles: ['ADMIN'] } }));
  server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json([PENDING, LEGACY, APPROVED, REJECTED])));
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null, mode: null }));
});

describe('approval status helpers', () => {
  it('treats a vehicle with no status (added before approval existed) as waiting for a decision', () => {
    expect(approvalOf(LEGACY)).toBe('PENDING');
    expect(needsReview(LEGACY)).toBe(true);
    expect(approvalLabel(LEGACY)).toBe('Not approved yet');
    expect(approvalLabel(PENDING)).toBe('Awaiting approval');
    expect(approvalLabel(APPROVED)).toBe('Approved');
    expect(approvalLabel(REJECTED)).toBe('Rejected');
  });

  it('filters the groups', () => {
    const all = [PENDING, LEGACY, APPROVED, REJECTED];
    expect(all.filter((v) => matchesApprovalFilter(v, 'REVIEW')).map((v) => v.id)).toEqual(['v-new', 'v-old']);
    expect(all.filter((v) => matchesApprovalFilter(v, 'APPROVED')).map((v) => v.id)).toEqual(['v-ok']);
    expect(all.filter((v) => matchesApprovalFilter(v, 'REJECTED')).map((v) => v.id)).toEqual(['v-no']);
    expect(all.filter((v) => matchesApprovalFilter(v, 'ALL'))).toHaveLength(4);
  });
});

describe('AdminVehicleApprovalsPage', () => {
  it('starts on what needs a decision: new listings and vehicles from before approval existed', async () => {
    renderUi(<AdminVehicleApprovalsPage />);
    expect(await screen.findByRole('heading', { name: 'New Prado' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Old Touran' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Good Noah' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Needs review · 2' })).toHaveAttribute('aria-selected', 'true');
  });

  it('can show approved, rejected or all vehicles', async () => {
    const user = userEvent.setup();
    renderUi(<AdminVehicleApprovalsPage />);
    await screen.findByRole('heading', { name: 'New Prado' });
    await user.click(screen.getByRole('tab', { name: /^approved/i }));
    expect(screen.getByRole('heading', { name: 'Good Noah' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'New Prado' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /^rejected/i }));
    expect(screen.getByRole('heading', { name: 'Bad Voxy' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /^all/i }));
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4);
  });

  it("shows the vehicle's details and its insurance state", async () => {
    renderUi(<AdminVehicleApprovalsPage />);
    const card = (await screen.findByRole('heading', { name: 'New Prado' })).closest('li');
    expect(within(card).getByText('KAA 111A · owner@example.com')).toBeInTheDocument();
    expect(within(card).getByText('Nairobi')).toBeInTheDocument();
    expect(within(card).getByText('Insured · sticker')).toBeInTheDocument();
    const old = screen.getByRole('heading', { name: 'Old Touran' }).closest('li');
    expect(within(old).getByText('Insured · no sticker')).toBeInTheDocument();
  });

  it('approves with PUT /vehicles/admin/{id}/review, sending the note', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/vehicles/admin/v-new/review`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...PENDING, approvalStatus: 'APPROVED' });
      })
    );
    renderUi(<AdminVehicleApprovalsPage />);
    const card = (await screen.findByRole('heading', { name: 'New Prado' })).closest('li');
    await user.type(within(card).getByLabelText(/note for the owner/i), 'All good');
    await user.click(within(card).getByRole('button', { name: 'Approve New Prado' }));
    await waitFor(() => expect(body).toEqual({ status: 'APPROVED', notes: 'All good' }));
  });

  it('rejects, and a vehicle from before approval existed can be approved like a new one', async () => {
    const user = userEvent.setup();
    const bodies = [];
    server.use(
      http.put(`${BASE}/vehicles/admin/:id/review`, async ({ request, params }) => {
        bodies.push({ id: params.id, ...(await request.json()) });
        return HttpResponse.json({ ...PENDING, approvalStatus: bodies[bodies.length - 1].status });
      })
    );
    renderUi(<AdminVehicleApprovalsPage />);
    const card = (await screen.findByRole('heading', { name: 'New Prado' })).closest('li');
    await user.click(within(card).getByRole('button', { name: 'Reject New Prado' }));
    const old = screen.getByRole('heading', { name: 'Old Touran' }).closest('li');
    await user.click(within(old).getByRole('button', { name: 'Approve Old Touran' }));
    await waitFor(() => expect(bodies).toEqual([{ id: 'v-new', status: 'REJECTED' }, { id: 'v-old', status: 'APPROVED' }]));
  });

  it('can reverse a decision — an approved vehicle offers Reject instead, with the note it was given', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/vehicles/admin/v-ok/review`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...APPROVED, approvalStatus: 'REJECTED' });
      })
    );
    renderUi(<AdminVehicleApprovalsPage />);
    await screen.findByRole('heading', { name: 'New Prado' });
    await user.click(screen.getByRole('tab', { name: /^approved/i }));
    const card = screen.getByRole('heading', { name: 'Good Noah' }).closest('li');
    expect(within(card).getByText(/approved by felix@example\.com/i)).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Approve Good Noah' })).not.toBeInTheDocument();
    await user.type(within(card).getByLabelText(/note for the owner/i), 'Wrong plate');
    await user.click(within(card).getByRole('button', { name: 'Reject Good Noah' }));
    await waitFor(() => expect(body).toEqual({ status: 'REJECTED', notes: 'Wrong plate' }));
  });

  it('shows the note a rejection carried', async () => {
    const user = userEvent.setup();
    renderUi(<AdminVehicleApprovalsPage />);
    await screen.findByRole('heading', { name: 'New Prado' });
    await user.click(screen.getByRole('tab', { name: /^rejected/i }));
    expect(screen.getByLabelText(/note for the owner/i)).toHaveValue('Sticker unreadable');
  });

  it("shows the backend's reason when a decision is refused", async () => {
    const user = userEvent.setup();
    server.use(http.put(`${BASE}/vehicles/admin/v-new/review`, () => HttpResponse.json({ message: 'Not allowed' }, { status: 403 })));
    renderUi(<AdminVehicleApprovalsPage />);
    const card = (await screen.findByRole('heading', { name: 'New Prado' })).closest('li');
    await user.click(within(card).getByRole('button', { name: 'Approve New Prado' }));
    expect(await screen.findByText(/not allowed/i)).toBeInTheDocument();
  });

  it('explains a bare 403 in words — the account has no permission, or the login is being refused', async () => {
    const user = userEvent.setup();
    server.use(http.put(`${BASE}/vehicles/admin/v-new/review`, () => new HttpResponse(null, { status: 403 })));
    renderUi(<AdminVehicleApprovalsPage />);
    const card = (await screen.findByRole('heading', { name: 'New Prado' })).closest('li');
    await user.click(within(card).getByRole('button', { name: 'Approve New Prado' }));
    expect(await screen.findByText(/the server refused it \(403\).*may not have permission.*logging out and back in/i)).toBeInTheDocument();
  });

  it("doesn't call it done when the answer doesn't carry the decision", async () => {
    const user = userEvent.setup();
    server.use(http.put(`${BASE}/vehicles/admin/v-new/review`, () => HttpResponse.json({ ...PENDING, approvalStatus: 'PENDING' })));
    renderUi(<AdminVehicleApprovalsPage />);
    const card = (await screen.findByRole('heading', { name: 'New Prado' })).closest('li');
    await user.click(within(card).getByRole('button', { name: 'Approve New Prado' }));
    expect(await screen.findByText(/didn.t record the decision/i)).toBeInTheDocument();
  });

  it('opens the insurance sticker with the automatic QR check', async () => {
    const user = userEvent.setup();
    renderUi(<AdminVehicleApprovalsPage />);
    const card = (await screen.findByRole('heading', { name: 'New Prado' })).closest('li');
    await user.click(within(card).getByRole('button', { name: 'Check the insurance sticker: New Prado' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('QR code found')).toBeInTheDocument();
    expect(scanSticker).toHaveBeenCalledWith(pixel);
  });

  it('shows photos when there are any, and says plainly when there are none', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json([{ ...PENDING, photos: [{ url: pixel }, { url: pixel }] }, LEGACY])));
    renderUi(<AdminVehicleApprovalsPage />);
    const card = (await screen.findByRole('heading', { name: 'New Prado' })).closest('li');
    await user.click(within(card).getByRole('button', { name: 'View photos of New Prado (2)' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('img', { name: 'New Prado — photo 2' })).toBeInTheDocument();
    const old = screen.getByRole('heading', { name: 'Old Touran' }).closest('li');
    expect(within(old).getByText(/no photos to show/i)).toBeInTheDocument();
  });

  it('says so when nothing needs a decision', async () => {
    server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json([APPROVED])));
    renderUi(<AdminVehicleApprovalsPage />);
    expect(await screen.findByText('Nothing to review')).toBeInTheDocument();
  });

  it('counts each group in the tabs and the tiles', async () => {
    renderUi(<AdminVehicleApprovalsPage />);
    await screen.findByRole('heading', { name: 'New Prado' });
    expect(screen.getByRole('tab', { name: 'Needs review · 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Approved · 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Rejected · 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All · 4' })).toBeInTheDocument();
  });

  it('searches by model, registration or owner', async () => {
    const user = userEvent.setup();
    renderUi(<AdminVehicleApprovalsPage />);
    await screen.findByRole('heading', { name: 'New Prado' });
    await user.type(screen.getByLabelText('Search'), 'touran');
    expect(screen.getByRole('heading', { name: 'Old Touran' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'New Prado' })).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Search'));
    await user.type(screen.getByLabelText('Search'), 'KAA 111');
    expect(screen.getByRole('heading', { name: 'New Prado' })).toBeInTheDocument();
  });

  describe('pagination', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...PENDING, id: `p-${i}`, model: `Car ${String(i + 1).padStart(2, '0')}`, registrationNumber: `KZZ ${100 + i}Z` }));

    beforeEach(() => {
      server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json(many)));
    });

    it('shows five vehicles a page, and says where you are', async () => {
      renderUi(<AdminVehicleApprovalsPage />);
      await screen.findByRole('heading', { name: 'Car 01' });
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(5);
      expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Showing 1–5 of 12 vehicles');
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    });

    it('moves to the next and previous pages, and to a numbered page', async () => {
      const user = userEvent.setup();
      renderUi(<AdminVehicleApprovalsPage />);
      await screen.findByRole('heading', { name: 'Car 01' });
      await user.click(screen.getByRole('button', { name: 'Next page' }));
      expect(await screen.findByRole('heading', { name: 'Car 06' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Car 01' })).not.toBeInTheDocument();
      expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Showing 6–10 of 12');
      await user.click(screen.getByRole('button', { name: 'Go to page 3' }));
      expect(await screen.findByRole('heading', { name: 'Car 11' })).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Previous page' }));
      expect(await screen.findByRole('heading', { name: 'Car 06' })).toBeInTheDocument();
    });

    it('goes back to the first page when the search changes', async () => {
      const user = userEvent.setup();
      renderUi(<AdminVehicleApprovalsPage />);
      await screen.findByRole('heading', { name: 'Car 01' });
      await user.click(screen.getByRole('button', { name: 'Next page' }));
      await screen.findByRole('heading', { name: 'Car 06' });
      await user.type(screen.getByLabelText('Search'), 'Car 1');
      // Car 10, 11, 12 match: a single page, from the start
      expect(await screen.findByRole('heading', { name: 'Car 10' })).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
    });

    it('shows no page controls when everything fits on one page', async () => {
      server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json(many.slice(0, 3))));
      renderUi(<AdminVehicleApprovalsPage />);
      await screen.findByRole('heading', { name: 'Car 01' });
      expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
    });
  });

  describe('the Approved Vehicles and Rejected Vehicles pages', () => {
    it('Approved Vehicles lists just the approved ones, with no tabs', async () => {
      renderUi(<AdminVehicleApprovalsPage view="approved" />);
      expect(await screen.findByRole('heading', { name: 'Good Noah' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Approved Vehicles' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'New Prado' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Bad Voxy' })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /vehicle approvals/i })).toHaveAttribute('href', '/admin/vehicles/approvals');
    });

    it('Rejected Vehicles lists just the rejected ones, with the note the owner was given', async () => {
      renderUi(<AdminVehicleApprovalsPage view="rejected" />);
      expect(await screen.findByRole('heading', { name: 'Bad Voxy' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Rejected Vehicles' })).toBeInTheDocument();
      expect(screen.getByLabelText(/note for the owner/i)).toHaveValue('Sticker unreadable');
      expect(screen.queryByRole('heading', { name: 'Good Noah' })).not.toBeInTheDocument();
    });

    it('shows a count, and how many still need a decision, linking back to the approvals', async () => {
      renderUi(<AdminVehicleApprovalsPage view="approved" />);
      await screen.findByRole('heading', { name: 'Good Noah' });
      expect(screen.getByText('Approved', { selector: 'p' }).parentElement).toHaveTextContent('1');
      expect(screen.getByRole('link', { name: /needs review: 2/i })).toHaveAttribute('href', '/admin/vehicles/approvals');
    });

    it('an approved vehicle can be changed to rejected from its own page', async () => {
      const user = userEvent.setup();
      let body;
      server.use(
        http.put(`${BASE}/vehicles/admin/v-ok/review`, async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ ...APPROVED, approvalStatus: 'REJECTED' });
        })
      );
      renderUi(<AdminVehicleApprovalsPage view="approved" />);
      await user.click(await screen.findByRole('button', { name: 'Reject Good Noah' }));
      await waitFor(() => expect(body).toEqual({ status: 'REJECTED' }));
    });

    it('searches within the group', async () => {
      const user = userEvent.setup();
      server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json([APPROVED, { ...APPROVED, id: 'v-ok2', model: 'Other Noah', registrationNumber: 'KEE 555E' }, PENDING])));
      renderUi(<AdminVehicleApprovalsPage view="approved" />);
      await screen.findByRole('heading', { name: 'Good Noah' });
      await user.type(screen.getByLabelText('Search'), 'other');
      expect(screen.getByRole('heading', { name: 'Other Noah' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Good Noah' })).not.toBeInTheDocument();
    });

    it('says so when none have been approved / rejected', async () => {
      server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json([PENDING])));
      const { unmount } = renderUi(<AdminVehicleApprovalsPage view="approved" />);
      expect(await screen.findByText('No vehicle has been approved yet.')).toBeInTheDocument();
      unmount();
      renderUi(<AdminVehicleApprovalsPage view="rejected" />);
      expect(await screen.findByText('No vehicle has been rejected.')).toBeInTheDocument();
    });

    it('paginates like the approvals page', async () => {
      const many = Array.from({ length: 7 }, (_, i) => ({ ...APPROVED, id: `a-${i}`, model: `Noah ${i + 1}`, registrationNumber: `KAA ${i}00A` }));
      server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json(many)));
      renderUi(<AdminVehicleApprovalsPage view="approved" />);
      await screen.findByRole('heading', { name: 'Noah 1' });
      expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Showing 1–5 of 7 vehicles');
    });

    it('has no accessibility violations', async () => {
      const { container } = renderUi(<AdminVehicleApprovalsPage view="rejected" />);
      await screen.findByRole('heading', { name: 'Bad Voxy' });
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderUi(<AdminVehicleApprovalsPage />);
    await screen.findByRole('heading', { name: 'New Prado' });
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('All Vehicles now reads every vehicle from /vehicles/admin/all', () => {
  it('shows each vehicle with its approval state, including unavailable and legacy ones', async () => {
    server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json([PENDING, { ...LEGACY, available: false }, APPROVED, REJECTED])));
    renderUi(<AdminVehiclesPage />);
    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(5);
    expect(screen.getByText('Awaiting approval')).toBeInTheDocument();
    expect(screen.getByText('Not approved yet')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });

  it('has an Edit button on each row', async () => {
    renderUi(<AdminVehiclesPage />);
    expect(await screen.findByRole('link', { name: 'Edit New Prado' })).toHaveAttribute('href', '/admin/vehicles/v-new/edit');
  });
});

describe('owner sees where a vehicle stands', () => {
  const render1 = (vehicle, extra = {}) => renderUi(<OwnerVehicleCard vehicle={vehicle} {...extra} />);

  it('a pending vehicle says renters cannot see it yet', () => {
    render1(PENDING);
    expect(within(screen.getByRole('note')).getByText('Awaiting approval')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/until an administrator approves it/i);
  });

  it('a vehicle from before approval existed says the same, as "not approved yet"', () => {
    render1(LEGACY);
    expect(screen.getByRole('note')).toHaveTextContent('Not approved yet');
  });

  it('a rejected vehicle shows the reason', () => {
    render1(REJECTED);
    expect(screen.getByRole('note')).toHaveTextContent('Reason: Sticker unreadable');
  });

  it('an approved vehicle shows no warning', () => {
    render1(APPROVED);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('shows nothing about approval when the backend sent no status field at all', () => {
    const { approvalStatus, ...without } = APPROVED; // eslint-disable-line no-unused-vars
    render1(without);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('has an Edit button when given somewhere to go', () => {
    render1(APPROVED, { editTo: '/owner/vehicles/v-ok/edit' });
    expect(screen.getByRole('link', { name: 'Edit Good Noah' })).toHaveAttribute('href', '/owner/vehicles/v-ok/edit');
  });
});

describe('EditVehiclePage', () => {
  const FULL = { ...APPROVED, capacity: 5, availableFrom: null, availableTo: null, tripTypes: ['GENERAL'] };

  function renderEdit(route = '/admin/vehicles/v-ok/edit') {
    return renderUi(
      <Routes>
        <Route path="/admin/vehicles/:vehicleId/edit" element={<EditVehiclePage />} />
        <Route path="/owner/vehicles/:vehicleId/edit" element={<EditVehiclePage />} />
        <Route path="*" element={<Where />} />
      </Routes>,
      route
    );
  }
  function Where() {
    return <p data-testid="where">{useLocation().pathname}</p>;
  }

  beforeEach(() => {
    server.use(http.get(`${BASE}/vehicles/v-ok`, () => HttpResponse.json(FULL)));
  });

  it("fills the form with the vehicle's current details", async () => {
    renderEdit();
    expect(await screen.findByDisplayValue('Good Noah')).toBeInTheDocument();
    expect(screen.getByLabelText('Registration Number')).toHaveValue('KCC 333C');
    expect(screen.getByLabelText('Price per Day (KES)')).toHaveValue(9000);
    expect(screen.getByLabelText('Seat Capacity')).toHaveValue(5);
    expect(screen.getByLabelText('Fuel Type')).toHaveValue('DIESEL');
  });

  it('saves changes with PUT /vehicles/{id}, sending every field and keeping the existing sticker', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/vehicles/v-ok`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...FULL, ...body });
      })
    );
    renderEdit();
    const price = await screen.findByLabelText('Price per Day (KES)');
    await user.clear(price);
    await user.type(price, '12000');
    await user.clear(screen.getByLabelText('Color'));
    await user.type(screen.getByLabelText('Color'), 'Black');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(body).toBeDefined());
    expect(body).toMatchObject({
      model: 'Good Noah', registrationNumber: 'KCC 333C', vin: 'VIN1', location: 'Nairobi', pricePerDay: 12000, capacity: 5, color: 'Black',
      fuelType: 'DIESEL', transmissionType: 'AUTOMATIC', selfDrive: true, available: true, hasWorkingAC: true, comprehensiveInsurance: true,
      insuranceVerificationStickerPhoto: pixel,
    });
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/admin/vehicles'));
  });

  it("says so, and stays on the form, when the server answers but doesn't keep the changes", async () => {
    const user = userEvent.setup();
    server.use(http.put(`${BASE}/vehicles/v-ok`, () => HttpResponse.json(FULL))); // the old price comes back
    renderEdit();
    const price = await screen.findByLabelText('Price per Day (KES)');
    await user.clear(price);
    await user.type(price, '12000');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(/didn.t keep your changes/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Price per Day (KES)')).toHaveValue(12000);
  });

  it('keeps the rules: a vehicle needs comprehensive insurance and its sticker', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/vehicles/v-ok`, () => HttpResponse.json({ ...FULL, insuranceVerificationStickerPhoto: null })));
    let sent = false;
    server.use(http.put(`${BASE}/vehicles/v-ok`, () => { sent = true; return HttpResponse.json(FULL); }));
    renderEdit();
    await screen.findByDisplayValue('Good Noah');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Upload a photo of the insurance sticker')).toBeInTheDocument();
    expect(sent).toBe(false);
  });

  it('checks the required fields', async () => {
    const user = userEvent.setup();
    renderEdit();
    const model = await screen.findByLabelText('Model');
    await user.clear(model);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Enter the vehicle model')).toBeInTheDocument();
  });

  it('replaces the insurance sticker: uploads the file, then saves it on the vehicle', async () => {
    const user = userEvent.setup();
    const calls = [];
    server.use(
      http.put(`${BASE}/vehicles/v-ok`, async ({ request }) => {
        const b = await request.json();
        calls.push(['PUT', b.insuranceVerificationStickerPhoto]);
        return HttpResponse.json({ ...FULL, ...b });
      }),
      http.post(`${BASE}/vehicles/v-ok/photos`, () => {
        calls.push(['POST photos']);
        return HttpResponse.json({ id: 'p', fileName: 'sticker.png', url: 'https://example.com/new-sticker.png' });
      })
    );
    renderEdit();
    await screen.findByDisplayValue('Good Noah');
    const file = new File(['x'], 'sticker.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText(/replace insurance sticker photo/i), file);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(calls.map((c) => c[0])).toEqual(['PUT', 'POST photos', 'PUT']));
    expect(calls[2][1]).toBe('https://example.com/new-sticker.png');
  });

  it('does not upload a photo a second time when Save is pressed again after something else failed', async () => {
    const user = userEvent.setup();
    let uploads = 0;
    server.use(
      // The vehicle is saved, but the server never keeps the new sticker — so the page stays open with the photo still picked.
      http.put(`${BASE}/vehicles/v-ok`, async ({ request }) => {
        const b = await request.json();
        return HttpResponse.json({ ...FULL, ...b, insuranceVerificationStickerPhoto: b.insuranceVerificationStickerPhoto === pixel ? pixel : null });
      }),
      http.post(`${BASE}/vehicles/v-ok/photos`, () => {
        uploads += 1;
        return HttpResponse.json({ id: `p${uploads}`, fileName: 'a.png', url: `https://example.com/p${uploads}.png` });
      })
    );
    renderEdit();
    await screen.findByDisplayValue('Good Noah');
    await user.upload(screen.getByLabelText(/replace insurance sticker photo/i), new File(['x'], 'sticker.png', { type: 'image/png' }));
    await user.upload(screen.getByLabelText(/add front photo/i), new File(['x'], 'front.png', { type: 'image/png' }));

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(/new insurance sticker photo didn.t upload/i)).toBeInTheDocument();
    expect(uploads).toBe(2); // the sticker and the front photo
    expect(screen.queryByText('front.png')).not.toBeInTheDocument(); // the front photo went up, so it is no longer waiting

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(uploads).toBe(3)); // only the sticker is sent again
  });

  it('adds new photos through POST /vehicles/{id}/photos', async () => {
    const user = userEvent.setup();
    let uploads = 0;
    server.use(
      http.put(`${BASE}/vehicles/v-ok`, async ({ request }) => HttpResponse.json({ ...FULL, ...(await request.json()) })),
      http.post(`${BASE}/vehicles/v-ok/photos`, () => {
        uploads += 1;
        return HttpResponse.json({ id: `p${uploads}`, fileName: 'a.png', url: 'https://example.com/a.png' });
      })
    );
    renderEdit();
    await screen.findByDisplayValue('Good Noah');
    const inputs = document.querySelectorAll('input[type="file"]');
    const photoInput = [...inputs].find((i) => i.multiple) || inputs[inputs.length - 1];
    await user.upload(photoInput, new File(['x'], 'extra.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(uploads).toBe(1));
  });

  describe('replacing and removing photos', () => {
    const WITH_PHOTOS = { ...FULL, photos: [{ id: 'ph-1', url: pixel }, { id: 'ph-2', url: pixel }] };
    beforeEach(() => {
      server.use(http.get(`${BASE}/vehicles/v-ok`, () => HttpResponse.json(WITH_PHOTOS)));
    });

    it('lists the current photos, each with Replace and Remove, and says these act at once', async () => {
      renderEdit();
      const list = await screen.findByRole('list', { name: 'Current photos' });
      expect(within(list).getAllByRole('listitem')).toHaveLength(2);
      expect(within(list).getByRole('button', { name: 'Replace photo 1' })).toBeEnabled();
      expect(within(list).getByRole('button', { name: 'Remove photo 2' })).toBeEnabled();
      expect(screen.getByText(/happens straight away, without pressing save/i)).toBeInTheDocument();
    });

    it('removes a photo after asking, with DELETE /vehicles/{id}/photos/{photoId}', async () => {
      const user = userEvent.setup();
      let deleted;
      server.use(http.delete(`${BASE}/vehicles/v-ok/photos/ph-2`, () => { deleted = 'ph-2'; return new HttpResponse(null, { status: 200 }); }));
      renderEdit();
      await user.click(await screen.findByRole('button', { name: 'Remove photo 2' }));
      const dialog = await screen.findByRole('dialog');
      expect(deleted).toBeUndefined();
      await user.click(within(dialog).getByRole('button', { name: 'Remove' }));
      await waitFor(() => expect(deleted).toBe('ph-2'));
    });

    it("shows the backend's reason, and keeps the photo, when a removal is refused", async () => {
      const user = userEvent.setup();
      server.use(http.delete(`${BASE}/vehicles/v-ok/photos/ph-1`, () => HttpResponse.json({ message: 'Photo is in use' }, { status: 409 })));
      renderEdit();
      await user.click(await screen.findByRole('button', { name: 'Remove photo 1' }));
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remove' }));
      expect(await screen.findByText(/photo is in use/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remove photo 1' })).toBeInTheDocument();
    });

    it('replaces a photo: uploads the new one first, then deletes the old one', async () => {
      const user = userEvent.setup();
      const calls = [];
      server.use(
        http.post(`${BASE}/vehicles/v-ok/photos`, () => {
          calls.push('POST');
          return HttpResponse.json({ id: 'ph-new', fileName: 'new.png', url: 'https://example.com/new.png' });
        }),
        http.delete(`${BASE}/vehicles/v-ok/photos/ph-1`, () => {
          calls.push('DELETE ph-1');
          return new HttpResponse(null, { status: 200 });
        })
      );
      renderEdit();
      await screen.findByRole('list', { name: 'Current photos' });
      await user.upload(screen.getByLabelText('Choose a new file to replace photo 1'), new File(['x'], 'fresh.png', { type: 'image/png' }));
      await waitFor(() => expect(calls).toEqual(['POST', 'DELETE ph-1']));
    });

    it('keeps the old photo when the new one fails to upload', async () => {
      const user = userEvent.setup();
      let deleted = false;
      server.use(
        http.post(`${BASE}/vehicles/v-ok/photos`, () => HttpResponse.json({ message: 'File too large' }, { status: 413 })),
        http.delete(`${BASE}/vehicles/v-ok/photos/ph-1`, () => { deleted = true; return new HttpResponse(null, { status: 200 }); })
      );
      renderEdit();
      await screen.findByRole('list', { name: 'Current photos' });
      await user.upload(screen.getByLabelText('Choose a new file to replace photo 1'), new File(['x'], 'big.png', { type: 'image/png' }));
      expect(await screen.findByText(/file too large/i)).toBeInTheDocument();
      expect(deleted).toBe(false);
    });

    it('says so when the new photo was added but the old one could not be removed', async () => {
      const user = userEvent.setup();
      server.use(
        http.post(`${BASE}/vehicles/v-ok/photos`, () => HttpResponse.json({ id: 'ph-new', fileName: 'n.png', url: 'https://example.com/n.png' })),
        http.delete(`${BASE}/vehicles/v-ok/photos/ph-1`, () => new HttpResponse(null, { status: 403 }))
      );
      renderEdit();
      await screen.findByRole('list', { name: 'Current photos' });
      await user.upload(screen.getByLabelText('Choose a new file to replace photo 1'), new File(['x'], 'n.png', { type: 'image/png' }));
      expect(await screen.findByText(/new photo was added, but the old one couldn.t be removed/i)).toBeInTheDocument();
    });

    it("can't change a photo whose id isn't known, and says why", async () => {
      server.use(http.get(`${BASE}/vehicles/v-ok`, () => HttpResponse.json({ ...FULL, photos: [{ url: pixel }] })));
      renderEdit();
      const replace = await screen.findByRole('button', { name: 'Replace photo 1' });
      expect(replace).toBeDisabled();
      expect(replace).toHaveAttribute('title', expect.stringMatching(/id isn.t known/i));
      expect(screen.getByRole('button', { name: 'Remove photo 1' })).toBeDisabled();
    });

    it('says plainly when there are no photos to change here', async () => {
      server.use(http.get(`${BASE}/vehicles/v-ok`, () => HttpResponse.json(FULL)));
      renderEdit();
      expect(await screen.findByText(/no photos to show or change here/i)).toBeInTheDocument();
    });
  });

  it("stops an owner editing someone else's vehicle", async () => {
    act(() => useAuthStore.setState({ token: 't', user: { id: 'u9', email: 'someone@example.com', roles: ['OWNER'] } }));
    renderEdit('/owner/vehicles/v-ok/edit');
    expect(await screen.findByText(/you can only edit your own vehicles/i)).toBeInTheDocument();
  });

  it("lets an owner edit their own vehicle, and goes back to My Vehicles afterwards", async () => {
    const user = userEvent.setup();
    act(() => useAuthStore.setState({ token: 't', user: { id: 'u9', email: 'owner@example.com', roles: ['OWNER'] } }));
    server.use(http.put(`${BASE}/vehicles/v-ok`, async ({ request }) => HttpResponse.json({ ...FULL, ...(await request.json()) })));
    renderEdit('/owner/vehicles/v-ok/edit');
    await screen.findByDisplayValue('Good Noah');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/owner/vehicles'));
  });

  it('has no accessibility violations', async () => {
    const { container } = renderEdit();
    await screen.findByDisplayValue('Good Noah');
    expect(await axe(container)).toHaveNoViolations();
  });
});
