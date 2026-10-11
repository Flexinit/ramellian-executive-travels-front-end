// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { axe } from 'jest-axe';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import AdminDocumentsPage from './AdminDocumentsPage';
import ContractTemplatesPage from './ContractTemplatesPage';
import AdminDashboardPage from './AdminDashboardPage';
import AdminBookingsPage from './AdminBookingsPage';
import AdminReportsPage from './AdminReportsPage';
import { emptyReport } from '../mocks/handlers';
import { withPlatformClause } from '../lib/contractBoilerplate';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderPage(element) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter>{element}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  act(() => useAuthStore.setState({ token: 't', user: { id: 'me-1', email: 'felix@example.com', roles: ['ADMIN'] } }));
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null, mode: null }));
});

// Shaped like the live `GET /documents/admin/pending` answer.
const NATIONAL_ID = {
  id: 'd-1', documentType: 'NATIONAL_ID', vehicleId: null, originalFileName: 'photo.jpg', contentType: 'image/jpeg',
  fileSize: 69585, reviewStatus: 'PENDING', reviewNotes: null, createdAt: '2026-09-23T19:17:49Z',
};
const PASSPORT = { ...NATIONAL_ID, id: 'd-2', documentType: 'PASSPORT', originalFileName: 'passport.png', contentType: 'image/png' };

describe('AdminDocumentsPage', () => {
  beforeEach(() => {
    window.URL.createObjectURL = (blob) => `blob:mock-${blob.type || 'file'}`;
    window.URL.revokeObjectURL = () => {};
    server.use(
      http.get(`${BASE}/documents/admin/pending`, () => HttpResponse.json([NATIONAL_ID, PASSPORT])),
      // The real file endpoint answers application/octet-stream whatever the file is.
      http.get(`${BASE}/documents/:id/content`, () => new HttpResponse(new Blob(['x']), { headers: { 'Content-Type': 'application/octet-stream' } }))
    );
  });

  it('lists the documents waiting for review, by type', async () => {
    renderPage(<AdminDocumentsPage />);
    expect(await screen.findByRole('heading', { name: 'National ID' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Passport' })).toBeInTheDocument();
    expect(screen.getByText(/photo\.jpg · 68 KB/)).toBeInTheDocument();
  });

  it('approves one with PUT /documents/admin/{id}/review', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/documents/admin/d-1/review`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...NATIONAL_ID, reviewStatus: 'APPROVED' });
      })
    );
    renderPage(<AdminDocumentsPage />);
    await user.click(await screen.findByRole('button', { name: 'Approve National ID' }));
    await waitFor(() => expect(body).toEqual({ status: 'APPROVED' }));
  });

  it('rejects one with the notes that were typed', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/documents/admin/d-2/review`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...PASSPORT, reviewStatus: 'REJECTED' });
      })
    );
    renderPage(<AdminDocumentsPage />);
    await screen.findByRole('heading', { name: 'Passport' });
    const card = screen.getByRole('heading', { name: 'Passport' }).closest('li');
    await user.type(within(card).getByLabelText(/notes for the person/i), 'Photo is blurry');
    await user.click(within(card).getByRole('button', { name: 'Reject Passport' }));
    await waitFor(() => expect(body).toEqual({ status: 'REJECTED', notes: 'Photo is blurry' }));
  });

  it('shows each document itself on its card, fetched from /documents/{id}/content', async () => {
    renderPage(<AdminDocumentsPage />);
    const card = (await screen.findByRole('heading', { name: 'National ID' })).closest('li');
    // given back the type its record says it has, since the endpoint says octet-stream
    expect(await within(card).findByRole('img', { name: 'photo.jpg' })).toHaveAttribute('src', 'blob:mock-image/jpeg');
    const passport = screen.getByRole('heading', { name: 'Passport' }).closest('li');
    expect(await within(passport).findByRole('img', { name: 'passport.png' })).toBeInTheDocument();
  });

  it('opens a document full size', async () => {
    const user = userEvent.setup();
    renderPage(<AdminDocumentsPage />);
    const card = (await screen.findByRole('heading', { name: 'National ID' })).closest('li');
    await user.click(within(card).getByRole('button', { name: /view full size/i }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('img', { name: 'photo.jpg' })).toBeInTheDocument();
  });

  it('shows a PDF in a reader on its card', async () => {
    server.use(
      http.get(`${BASE}/documents/admin/pending`, () =>
        HttpResponse.json([{ ...NATIONAL_ID, id: 'd-9', originalFileName: 'id.pdf', contentType: 'application/pdf' }])
      )
    );
    renderPage(<AdminDocumentsPage />);
    const card = (await screen.findByRole('heading', { name: 'National ID' })).closest('li');
    expect(await within(card).findByTitle('id.pdf')).toHaveAttribute('src', 'blob:mock-application/pdf');
  });

  it("says so when a file can't be loaded, without losing the review buttons", async () => {
    server.use(http.get(`${BASE}/documents/:id/content`, () => new HttpResponse(null, { status: 404 })));
    renderPage(<AdminDocumentsPage />);
    const card = (await screen.findByRole('heading', { name: 'National ID' })).closest('li');
    expect(await within(card).findByText(/couldn't load this file/i)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Approve National ID' })).toBeEnabled();
  });

  it('says so when there is nothing to review', async () => {
    server.use(http.get(`${BASE}/documents/admin/pending`, () => HttpResponse.json([])));
    renderPage(<AdminDocumentsPage />);
    expect(await screen.findByText('Nothing to review')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPage(<AdminDocumentsPage />);
    await screen.findByRole('heading', { name: 'National ID' });
    expect(await axe(container)).toHaveNoViolations();
  });
});

const TEMPLATE = { id: 't-1', ownerId: 'o-1', name: 'Standard Agreement', version: 2, status: 'PENDING', content: '# Agreement' };

describe('ContractTemplatesPage', () => {
  beforeEach(() => {
    server.use(http.get(`${BASE}/contract-templates/admin`, () => HttpResponse.json([TEMPLATE])));
  });

  it('lists templates with their version and status', async () => {
    renderPage(<ContractTemplatesPage />);
    expect(await screen.findByRole('heading', { name: 'Standard Agreement' })).toBeInTheDocument();
    expect(screen.getByText('Version 2')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows the contract text on request', async () => {
    const user = userEvent.setup();
    renderPage(<ContractTemplatesPage />);
    await user.click(await screen.findByRole('button', { name: 'Read text' }));
    expect(screen.getByText('# Agreement')).toBeInTheDocument();
  });

  it('approves a template with PUT /contract-templates/admin/{id}/review', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/contract-templates/admin/t-1/review`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...TEMPLATE, status: 'APPROVED' });
      })
    );
    renderPage(<ContractTemplatesPage />);
    await user.click(await screen.findByRole('button', { name: 'Approve Standard Agreement' }));
    await waitFor(() => expect(body).toEqual({ status: 'APPROVED' }));
  });

  it('adds a template with POST /contract-templates/admin, sending name and content', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/contract-templates/admin`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...TEMPLATE, id: 't-2', name: body.name }, { status: 201 });
      })
    );
    renderPage(<ContractTemplatesPage />);
    await user.click(await screen.findByRole('button', { name: /new template/i }));
    const save = screen.getByRole('button', { name: 'Save Template' });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText('Template Name'), 'Weekend Hire');
    await user.type(screen.getByLabelText(/contract body/i), 'Terms');
    await user.click(save);
    await waitFor(() => expect(body).toEqual({ name: 'Weekend Hire', content: withPlatformClause('Terms') }));
    expect(await screen.findByRole('heading', { name: 'Contract Templates' })).toBeInTheDocument();
  });

  it('saves a change as a new version, starting from the existing text', async () => {
    const user = userEvent.setup();
    renderPage(<ContractTemplatesPage />);
    await user.click(await screen.findByRole('button', { name: 'Save a new version' }));
    expect(screen.getByLabelText('Template Name')).toHaveValue('Standard Agreement');
    expect(screen.getByLabelText(/contract body/i)).toHaveValue('# Agreement');
  });
});

describe('AdminDashboardPage', () => {
  it('counts users and documents to review, and reads the booking report by its real field names', async () => {
    server.use(
      http.get(`${BASE}/users/admin`, () => HttpResponse.json([{ id: 'a' }, { id: 'b' }, { id: 'c' }])),
      http.get(`${BASE}/documents/admin/pending`, () => HttpResponse.json([NATIONAL_ID])),
      http.get(`${BASE}/bookings/reports/admin`, () =>
        HttpResponse.json({ ...emptyReport, totalBookings: 7, successfulGrossAmount: 120000, platformRevenue: 12000 })
      )
    );
    renderPage(<AdminDashboardPage />);
    expect(await screen.findByRole('link', { name: 'Users: 3' })).toHaveAttribute('href', '/admin/users');
    expect(await screen.findByRole('link', { name: 'Documents to review: 1' })).toHaveAttribute('href', '/admin/documents');
    expect(await screen.findByRole('link', { name: 'All Bookings: 7' })).toHaveAttribute('href', '/admin/bookings');
    expect(await screen.findByRole('link', { name: /Platform Revenue: .*12,000/ })).toBeInTheDocument();
  });
});

describe('All Bookings and Reports (built from the admin report)', () => {
  const BOOKING = (id, status, startTime) => ({
    id, vehicleId: 'v-1', renterEmail: `${id}@example.com`, startTime, endTime: startTime, status, estimatedAmount: 5000, numberOfDays: 1, tripType: 'GENERAL',
  });

  beforeEach(() => {
    server.use(
      http.get(`${BASE}/bookings/reports/admin`, () =>
        HttpResponse.json({
          ...emptyReport,
          totalBookings: 2,
          upcoming: [BOOKING('b-1', 'CONFIRMED', '2026-10-01T09:00:00Z')],
          cancelled: [BOOKING('b-2', 'CANCELLED', '2026-09-01T09:00:00Z')],
        })
      )
    );
  });

  it('defaults to the Confirmed tab, lists every booking in the report once All is picked, and can filter by status', async () => {
    const user = userEvent.setup();
    renderPage(<AdminBookingsPage />);
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2)); // header + the one Confirmed booking
    expect(within(screen.getAllByRole('row')[1]).getByText('Confirmed')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /^all\b/i }));
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + two bookings

    await user.click(screen.getByRole('tab', { name: /cancelled/i }));
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(within(screen.getAllByRole('row')[1]).getByText('Cancelled')).toBeInTheDocument();
  });

  it('shows the booking cost from estimatedAmount', async () => {
    renderPage(<AdminBookingsPage />);
    const rows = await screen.findAllByRole('row');
    expect(within(rows[1]).getByText(/5,000/)).toBeInTheDocument();
  });

  it('the reports page shows totals on the Revenue tab, and the bookings themselves on the Bookings tab', async () => {
    const user = userEvent.setup();
    renderPage(<AdminReportsPage />);

    await user.click(screen.getByRole('tab', { name: 'Revenue' }));
    expect(await screen.findByText('Platform Revenue')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Bookings' }));
    // The Bookings tab opens on its own default Confirmed status tab (see useBookingFilters), showing only
    // the one Confirmed booking out of the two in the report.
    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(2); // header + the one Confirmed booking
  });
});
