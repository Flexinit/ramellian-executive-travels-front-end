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
import { Toaster } from 'react-hot-toast';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import AdminDocumentsPage from './AdminDocumentsPage';
import AdminReviewedDocumentsPage from './AdminReviewedDocumentsPage';
import { getReviews, recordReview } from '../lib/documentReviews';

const BASE = 'http://192.168.8.11:8080/api/v1';

const NATIONAL_ID = {
  id: 'd-1', documentType: 'NATIONAL_ID', vehicleId: null, originalFileName: 'photo.jpg', contentType: 'image/jpeg',
  fileSize: 69585, reviewStatus: 'PENDING', reviewNotes: null, createdAt: '2026-09-23T19:17:49Z',
};
const PASSPORT = { ...NATIONAL_ID, id: 'd-2', documentType: 'PASSPORT', originalFileName: 'passport.png', contentType: 'image/png' };

function renderPage(element) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <Toaster />
        <MemoryRouter>{element}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  window.URL.createObjectURL = (blob) => `blob:mock-${blob.type || 'file'}`;
  window.URL.revokeObjectURL = () => {};
  act(() => useAuthStore.setState({ token: 't', user: { id: 'me-1', email: 'felix@example.com', roles: ['ADMIN'] } }));
  server.use(
    http.get(`${BASE}/documents/admin/pending`, () => HttpResponse.json([NATIONAL_ID])),
    http.get(`${BASE}/documents/me`, () => HttpResponse.json([])),
    http.get(`${BASE}/documents/:id/content`, () => new HttpResponse(new Blob(['x']), { headers: { 'Content-Type': 'application/octet-stream' } }))
  );
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null, mode: null }));
  window.localStorage.clear();
});

describe('remembering decisions', () => {
  it('approving on the review page records the decision, so it appears under Approved', async () => {
    const user = userEvent.setup();
    server.use(http.put(`${BASE}/documents/admin/d-1/review`, () => HttpResponse.json({ ...NATIONAL_ID, reviewStatus: 'APPROVED' })));
    renderPage(<AdminDocumentsPage />);
    await user.type(await screen.findByLabelText(/notes for the person/i), 'Clear photo');
    await user.click(screen.getByRole('button', { name: 'Approve National ID' }));
    await waitFor(() => expect(getReviews()).toHaveLength(1));
    expect(getReviews()[0]).toMatchObject({ id: 'd-1', status: 'APPROVED', notes: 'Clear photo', originalFileName: 'photo.jpg', contentType: 'image/jpeg' });
  });

  it('a decision the backend refuses is not recorded', async () => {
    const user = userEvent.setup();
    server.use(http.put(`${BASE}/documents/admin/d-1/review`, () => HttpResponse.json({ message: 'Nope' }, { status: 400 })));
    renderPage(<AdminDocumentsPage />);
    await user.click(await screen.findByRole('button', { name: 'Reject National ID' }));
    expect(await screen.findByText(/nope/i)).toBeInTheDocument();
    expect(getReviews()).toHaveLength(0);
  });

  it('points to the Approved and Rejected pages from the review page', async () => {
    renderPage(<AdminDocumentsPage />);
    expect(await screen.findByText('Approved Documents')).toBeInTheDocument();
    expect(screen.getByText('Rejected Documents')).toBeInTheDocument();
  });
});

describe('Approved and Rejected pages', () => {
  it('lists only the decisions with that outcome, each with the document shown again', async () => {
    recordReview(NATIONAL_ID, 'APPROVED');
    recordReview(PASSPORT, 'REJECTED', 'Blurry');
    renderPage(<AdminReviewedDocumentsPage status="APPROVED" />);
    const card = (await screen.findByRole('heading', { name: 'National ID' })).closest('li');
    expect(await within(card).findByRole('img', { name: 'photo.jpg' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Passport' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Approved Documents' })).toBeInTheDocument();
  });

  it('the Rejected page shows the note saved with the rejection', async () => {
    recordReview(PASSPORT, 'REJECTED', 'Blurry');
    renderPage(<AdminReviewedDocumentsPage status="REJECTED" />);
    expect(await screen.findByLabelText(/notes for the person/i)).toHaveValue('Blurry');
  });

  it("says so when there's nothing yet, and that the backend doesn't keep a list", () => {
    renderPage(<AdminReviewedDocumentsPage status="REJECTED" />);
    expect(screen.getByText('No rejected documents yet')).toBeInTheDocument();
    expect(screen.getByText(/your decisions are saved by the backend/i)).toBeInTheDocument();
  });

  it('reverses an approval by rejecting instead (PUT status REJECTED), moving it to the Rejected list', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/documents/admin/d-1/review`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...NATIONAL_ID, reviewStatus: 'REJECTED' });
      })
    );
    recordReview(NATIONAL_ID, 'APPROVED');
    renderPage(<AdminReviewedDocumentsPage status="APPROVED" />);
    await user.type(await screen.findByLabelText(/notes for the person/i), 'Expired ID');
    await user.click(screen.getByRole('button', { name: 'Reject instead: National ID' }));
    await waitFor(() => expect(body).toEqual({ status: 'REJECTED', notes: 'Expired ID' }));
    await waitFor(() => expect(screen.getByText('No approved documents yet')).toBeInTheDocument());
    expect(getReviews()[0]).toMatchObject({ id: 'd-1', status: 'REJECTED', notes: 'Expired ID' });
  });

  it('reverses a rejection by approving instead', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/documents/admin/d-2/review`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...PASSPORT, reviewStatus: 'APPROVED' });
      })
    );
    recordReview(PASSPORT, 'REJECTED');
    renderPage(<AdminReviewedDocumentsPage status="REJECTED" />);
    await user.click(await screen.findByRole('button', { name: 'Approve instead: Passport' }));
    await waitFor(() => expect(body).toEqual({ status: 'APPROVED' }));
    await waitFor(() => expect(getReviews()[0]).toMatchObject({ id: 'd-2', status: 'APPROVED' }));
  });

  it('sends a decided document back to pending review (PUT status PENDING) and forgets the decision', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/documents/admin/d-1/review`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...NATIONAL_ID, reviewStatus: 'PENDING' });
      })
    );
    recordReview(NATIONAL_ID, 'APPROVED', 'ok');
    renderPage(<AdminReviewedDocumentsPage status="APPROVED" />);
    await user.click(await screen.findByRole('button', { name: 'Send National ID back to pending review' }));
    await waitFor(() => expect(body).toEqual({ status: 'PENDING' }));
    await waitFor(() => expect(getReviews()).toHaveLength(0));
  });

  it("keeps the decision and shows the backend's message when it refuses to reverse it", async () => {
    const user = userEvent.setup();
    server.use(http.put(`${BASE}/documents/admin/d-1/review`, () => HttpResponse.json({ message: 'Invalid review status' }, { status: 400 })));
    recordReview(NATIONAL_ID, 'APPROVED');
    renderPage(<AdminReviewedDocumentsPage status="APPROVED" />);
    await user.click(await screen.findByRole('button', { name: 'Send National ID back to pending review' }));
    expect(await screen.findByText(/invalid review status/i)).toBeInTheDocument();
    expect(getReviews()).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'National ID' })).toBeInTheDocument();
  });

  it('lists the reviewer’s own documents the backend says are approved or rejected, even with no record from this browser', async () => {
    server.use(
      http.get(`${BASE}/documents/me`, () =>
        HttpResponse.json([
          { ...PASSPORT, reviewStatus: 'APPROVED' },
          { ...NATIONAL_ID, reviewStatus: 'REJECTED', reviewNotes: 'Blurry' },
          { ...NATIONAL_ID, id: 'd-7', documentType: 'PROOF_OF_ADDRESS', reviewStatus: 'PENDING' },
        ])
      )
    );
    const { unmount } = renderPage(<AdminReviewedDocumentsPage status="APPROVED" />);
    const card = (await screen.findByRole('heading', { name: 'Passport' })).closest('li');
    expect(within(card).getByText('One of your own documents')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'National ID' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Proof of Address' })).not.toBeInTheDocument();
    unmount();

    renderPage(<AdminReviewedDocumentsPage status="REJECTED" />);
    const rejected = (await screen.findByRole('heading', { name: 'National ID' })).closest('li');
    expect(within(rejected).getByLabelText(/notes for the person/i)).toHaveValue('Blurry');
    expect(screen.queryByRole('heading', { name: 'Passport' })).not.toBeInTheDocument();
  });

  it('does not list a document twice when this browser also recorded the decision', async () => {
    server.use(http.get(`${BASE}/documents/me`, () => HttpResponse.json([{ ...NATIONAL_ID, reviewStatus: 'APPROVED' }])));
    recordReview(NATIONAL_ID, 'APPROVED');
    renderPage(<AdminReviewedDocumentsPage status="APPROVED" />);
    await screen.findByRole('heading', { name: 'National ID' });
    expect(screen.getAllByRole('heading', { name: 'National ID' })).toHaveLength(1);
  });

  it('can reverse one of the reviewer’s own decided documents too', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.get(`${BASE}/documents/me`, () => HttpResponse.json([{ ...PASSPORT, reviewStatus: 'APPROVED' }])),
      http.put(`${BASE}/documents/admin/d-2/review`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...PASSPORT, reviewStatus: 'REJECTED' });
      })
    );
    renderPage(<AdminReviewedDocumentsPage status="APPROVED" />);
    await user.click(await screen.findByRole('button', { name: 'Reject instead: Passport' }));
    await waitFor(() => expect(body).toEqual({ status: 'REJECTED' }));
  });

  it('opens a decided document full size', async () => {
    const user = userEvent.setup();
    recordReview(NATIONAL_ID, 'APPROVED');
    renderPage(<AdminReviewedDocumentsPage status="APPROVED" />);
    await user.click(await screen.findByRole('button', { name: /view full size/i }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('img', { name: 'photo.jpg' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    recordReview(NATIONAL_ID, 'APPROVED');
    const { container } = renderPage(<AdminReviewedDocumentsPage status="APPROVED" />);
    await screen.findByRole('heading', { name: 'National ID' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
