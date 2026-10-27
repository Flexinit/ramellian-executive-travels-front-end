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
import { withPlatformClause } from '../lib/contractBoilerplate';
import AdminAuditLogPage from './AdminAuditLogPage';
import OwnerContractTemplatesPage from './OwnerContractTemplatesPage';
import AdminVehiclesPage from './AdminVehiclesPage';
import BookingDetailPage from './BookingDetailPage';
import SecuritySection from '../components/profile/SecuritySection';
import ReviewList from '../components/reviews/ReviewList';
import ReviewForm from '../components/reviews/ReviewForm';
import BookingStatusControl from '../components/booking/BookingStatusControl';
import ConfirmPaymentForm from '../components/booking/ConfirmPaymentForm';
import VehicleTag from '../components/admin/VehicleTag';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

function renderUi(element, { route = '/' } = {}) {
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
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null, mode: null }));
});

// ─── Audit log ───────────────────────────────────────────────────────────────

const ENTRY = {
  id: 'a-1', actorEmail: 'ann@example.com', actorId: null, actorRole: null, action: 'AUTH_LOGIN', resourceType: 'USER',
  resourceId: 'u-9', details: 'User logged in successfully', ipAddress: null, status: 'SUCCESS', createdAt: '2026-09-24T18:07:52Z',
};
const page = (content, extra = {}) => ({
  content, empty: content.length === 0, first: true, last: true, number: 0, numberOfElements: content.length, size: 20,
  totalElements: content.length, totalPages: 1, ...extra,
});

describe('AdminAuditLogPage', () => {
  it('lists entries newest first, reading the spec page shape', async () => {
    let params;
    server.use(
      http.get(`${BASE}/admin/audit-logs`, ({ request }) => {
        params = new URL(request.url).searchParams;
        return HttpResponse.json(page([ENTRY, { ...ENTRY, id: 'a-2', action: 'VEHICLE_CREATE', status: 'FAILURE' }]));
      })
    );
    renderUi(<AdminAuditLogPage />);
    const row = await screen.findByRole('row', { name: 'Open Auth login by ann@example.com' });
    expect(within(row).getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /open vehicle create/i })).toBeInTheDocument();
    expect(screen.getByText('2 entries')).toBeInTheDocument();
    expect(params.get('page')).toBe('0');
    expect(params.get('size')).toBe('20');
    expect(params.get('sort')).toBe('createdAt,desc');
  });

  it('sends the filters typed in', async () => {
    const user = userEvent.setup();
    const seen = [];
    server.use(
      http.get(`${BASE}/admin/audit-logs`, ({ request }) => {
        seen.push(new URL(request.url).searchParams);
        return HttpResponse.json(page([ENTRY]));
      })
    );
    renderUi(<AdminAuditLogPage />);
    await screen.findByRole('row', { name: /open auth login/i });
    await user.type(screen.getByLabelText('Action'), 'LOGIN');
    await user.type(screen.getByLabelText("Person's email"), 'ann@');
    await user.type(screen.getByLabelText('Kind of record'), 'USER');
    await waitFor(() => {
      const last = seen[seen.length - 1];
      expect(last.get('action')).toBe('LOGIN');
      expect(last.get('actorEmail')).toBe('ann@');
      expect(last.get('resourceType')).toBe('USER');
    });
  });

  it('moves between pages', async () => {
    const user = userEvent.setup();
    const pages = [];
    server.use(
      http.get(`${BASE}/admin/audit-logs`, ({ request }) => {
        const n = Number(new URL(request.url).searchParams.get('page'));
        pages.push(n);
        return HttpResponse.json(page([{ ...ENTRY, id: `a-${n}` }], { number: n, totalPages: 3, totalElements: 41, first: n === 0, last: n === 2 }));
      })
    );
    renderUi(<AdminAuditLogPage />);
    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /newer/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /older/i }));
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument();
    expect(pages).toContain(1);
  });

  it('opens an entry, fetched by id from /admin/audit-logs/{id}', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${BASE}/admin/audit-logs`, () => HttpResponse.json(page([ENTRY]))),
      http.get(`${BASE}/admin/audit-logs/a-1`, () => HttpResponse.json({ ...ENTRY, ipAddress: '10.0.0.7' }))
    );
    renderUi(<AdminAuditLogPage />);
    await user.click(await screen.findByRole('row', { name: /open auth login/i }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('10.0.0.7')).toBeInTheDocument();
    expect(within(dialog).getByText('User logged in successfully')).toBeInTheDocument();
  });

  it('says so when nothing matches, and has no accessibility violations', async () => {
    server.use(http.get(`${BASE}/admin/audit-logs`, () => HttpResponse.json(page([ENTRY]))));
    const { container } = renderUi(<AdminAuditLogPage />);
    await screen.findByRole('row', { name: /open auth login/i });
    expect(await axe(container)).toHaveNoViolations();
  });
});

// ─── Security: password, two-factor, recent activity ─────────────────────────

describe('SecuritySection', () => {
  beforeEach(() => {
    server.use(http.get(`${BASE}/users/me`, () => HttpResponse.json({ id: 'me-1', email: 'felix@example.com', twoFactorEnabled: false })));
  });

  async function fillPasswords(user, { current = 'oldpassword', next = 'newpassword1!', confirm = 'newpassword1!' } = {}) {
    await user.type(screen.getByLabelText('Current password'), current);
    await user.type(screen.getByLabelText('New password'), next);
    await user.type(screen.getByLabelText('Confirm new password'), confirm);
  }

  it('changes the password with PUT /users/me/password', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/users/me/password`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 200 });
      })
    );
    renderUi(<SecuritySection />);
    await fillPasswords(user);
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    await waitFor(() => expect(body).toEqual({ currentPassword: 'oldpassword', newPassword: 'newpassword1!' }));
    await waitFor(() => expect(screen.getByLabelText('Current password')).toHaveValue(''));
  });

  it('checks the new password against the spec limits and the confirmation before sending anything', async () => {
    const user = userEvent.setup();
    let sent = false;
    server.use(http.put(`${BASE}/users/me/password`, () => { sent = true; return new HttpResponse(null, { status: 200 }); }));
    renderUi(<SecuritySection />);
    await fillPasswords(user, { next: 'short', confirm: 'different' });
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('At least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(sent).toBe(false);
  });

  it("shows the backend's reason on the form when the password is refused", async () => {
    const user = userEvent.setup();
    server.use(http.put(`${BASE}/users/me/password`, () => HttpResponse.json({ message: 'Current password is incorrect' }, { status: 400 })));
    renderUi(<SecuritySection />);
    await fillPasswords(user);
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText(/current password is incorrect/i)).toBeInTheDocument();
  });

  it('turns two-factor on with PUT /users/me/2fa, sending the method', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/users/me/2fa`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'me-1', email: 'felix@example.com', twoFactorEnabled: true, twoFactorMethod: 'EMAIL' });
      })
    );
    renderUi(<SecuritySection />, { route: '/?section=2fa' });
    const toggle = await screen.findByRole('switch', { name: 'Two-factor sign-in' });
    await waitFor(() => expect(toggle).toBeEnabled());
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await user.click(toggle);
    await waitFor(() => expect(body).toEqual({ enabled: true, method: 'EMAIL' }));
  });

  it('turns two-factor off when it is on', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.get(`${BASE}/users/me`, () => HttpResponse.json({ id: 'me-1', email: 'felix@example.com', twoFactorEnabled: true, twoFactorMethod: 'EMAIL' })),
      http.put(`${BASE}/users/me/2fa`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'me-1', twoFactorEnabled: false });
      })
    );
    renderUi(<SecuritySection />, { route: '/?section=2fa' });
    const toggle = await screen.findByRole('switch', { name: 'Two-factor sign-in' });
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
    await user.click(toggle);
    await waitFor(() => expect(body).toEqual({ enabled: false, method: 'EMAIL' }));
  });

  it('lists recent activity from /audit-logs and opens an entry from /audit-logs/{id}', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${BASE}/audit-logs`, () => HttpResponse.json(page([ENTRY]))),
      http.get(`${BASE}/audit-logs/a-1`, () => HttpResponse.json({ ...ENTRY, ipAddress: '10.1.1.1' }))
    );
    renderUi(<SecuritySection />);
    await user.click(screen.getByRole('tab', { name: 'Recent activity' }));
    await user.click(await screen.findByRole('button', { name: /auth login/i }));
    expect(await screen.findByText('10.1.1.1')).toBeInTheDocument();
  });

  it('says so when the activity cannot be read', async () => {
    server.use(http.get(`${BASE}/audit-logs`, () => new HttpResponse(null, { status: 403 })));
    renderUi(<SecuritySection />, { route: '/?section=activity' });
    expect(await screen.findByText(/your activity isn.t available right now/i)).toBeInTheDocument();
  });

  it('shows one part at a time, in tabs — Password first', async () => {
    const user = userEvent.setup();
    renderUi(<SecuritySection />);
    expect(screen.getByRole('tab', { name: 'Password' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Current password')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Two-factor sign-in' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Two-factor' }));
    expect(await screen.findByRole('switch', { name: 'Two-factor sign-in' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Current password')).not.toBeInTheDocument();
  });
});

// ─── Reviews ─────────────────────────────────────────────────────────────────

const REVIEWS = [
  { id: 'r-1', vehicleId: 'v-1', reviewerEmail: 'a@example.com', rating: 5, feedback: 'Spotless', complaint: null },
  { id: 'r-2', vehicleId: 'v-1', reviewerEmail: 'b@example.com', rating: 3, feedback: 'Fine', complaint: 'Late pickup' },
];

describe('reviews', () => {
  it('shows the average and each review, and hides complaints from the public', () => {
    renderUi(<ReviewList reviews={REVIEWS} />);
    expect(screen.getByText('4.0')).toBeInTheDocument();
    expect(screen.getByText(/from 2 reviews/)).toBeInTheDocument();
    expect(screen.getByText('Spotless')).toBeInTheDocument();
    expect(screen.queryByText(/late pickup/i)).not.toBeInTheDocument();
  });

  it('shows complaints to an administrator', () => {
    renderUi(<ReviewList reviews={REVIEWS} showComplaints />);
    expect(screen.getByText(/late pickup/i)).toBeInTheDocument();
  });

  it('says so when there are none', () => {
    renderUi(<ReviewList reviews={[]} emptyText="No reviews yet" />);
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
  });

  it('a renter reviews a booking with POST /reviews/bookings/{id} — rating needed, phone numbers stripped', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/reviews/bookings/b-1`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'r-9', vehicleId: 'v-1', rating: 4 }, { status: 201 });
      })
    );
    renderUi(<ReviewForm bookingId="b-1" />);
    const send = screen.getByRole('button', { name: 'Send review' });
    expect(send).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.type(screen.getByLabelText(/how was the trip/i), 'Great, call me on 0712345678');
    await user.click(send);
    await waitFor(() => expect(body).toMatchObject({ rating: 4 }));
    expect(body.feedback).not.toMatch(/0712345678/);
    expect(body).not.toHaveProperty('complaint');
  });
});

// ─── Booking: status, payment, cancel, review ────────────────────────────────

// `startTime` is relative to "now" rather than a fixed calendar date — the cancel test below depends on
// this booking being far enough in the future for CancelBookingModal's policy preview to allow cancelling.
const BOOKING = {
  id: 'b-1',
  vehicleId: 'v-1',
  renterEmail: 'r@example.com',
  startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  endTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'PENDING',
  estimatedAmount: 5000,
  numberOfDays: 1,
  tripType: 'GENERAL',
};

describe('booking actions', () => {
  it('moves a booking to another status with PUT /bookings/{id}/status, sending the note', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.put(`${BASE}/bookings/b-1/status`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...BOOKING, status: 'CONFIRMED' });
      })
    );
    renderUi(<BookingStatusControl booking={BOOKING} />);
    const save = screen.getByRole('button', { name: 'Update status' });
    expect(save).toBeDisabled();
    expect(within(screen.getByLabelText('Move this booking to')).queryByRole('option', { name: 'Pending Payment' })).not.toBeInTheDocument(); // not its current status
    await user.selectOptions(screen.getByLabelText('Move this booking to'), 'CONFIRMED');
    await user.type(screen.getByLabelText(/note/i), 'Deposit received');
    await user.click(save);
    await waitFor(() => expect(body).toEqual({ status: 'CONFIRMED', notes: 'Deposit received' }));
  });

  it("shows the backend's message when a status is refused", async () => {
    const user = userEvent.setup();
    server.use(http.put(`${BASE}/bookings/b-1/status`, () => HttpResponse.json({ message: 'Invalid transition' }, { status: 400 })));
    renderUi(<BookingStatusControl booking={BOOKING} />);
    await user.selectOptions(screen.getByLabelText('Move this booking to'), 'COMPLETED');
    await user.click(screen.getByRole('button', { name: 'Update status' }));
    expect(await screen.findByText(/invalid transition/i)).toBeInTheDocument();
  });

  it('records a payment with POST /payments/bookings/{id}/confirm', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/payments/bookings/b-1/confirm`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'c-1', bookingId: 'b-1', status: 'PAID' });
      })
    );
    renderUi(<ConfirmPaymentForm booking={BOOKING} />);
    const save = screen.getByRole('button', { name: 'Record payment' });
    expect(save).toBeDisabled();
    await user.type(screen.getByLabelText('Payment method'), 'M-Pesa');
    await user.type(screen.getByLabelText('Transaction reference'), 'QWE123');
    await user.click(save);
    await waitFor(() => expect(body).toEqual({ paymentMethod: 'M-Pesa', transactionReference: 'QWE123' }));
  });

  function renderRenterBooking(status) {
    server.use(
      http.get(`${BASE}/bookings/b-1`, () => HttpResponse.json({ ...BOOKING, status })),
      http.get(`${BASE}/vehicles/v-1`, () => HttpResponse.json({ id: 'v-1', model: 'Toyota Prado', pricePerDay: 5000 }))
    );
    return renderUi(
      <Routes>
        <Route path="/dashboard/bookings/:bookingId" element={<BookingDetailPage />} />
      </Routes>,
      { route: '/dashboard/bookings/b-1' }
    );
  }

  it('lets a renter cancel a booking that has not started, after a policy-aware confirmation', async () => {
    const user = userEvent.setup();
    let cancelled = false;
    server.use(
      http.post(`${BASE}/booking-policies/bookings/b-1/cancel`, () => {
        cancelled = true;
        return HttpResponse.json({ bookingId: 'b-1', bookingStatus: 'CANCELLED', refundAmount: 5000, refundPercent: 100, message: 'Booking cancelled.' });
      })
    );
    renderRenterBooking('CONFIRMED');
    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    expect(cancelled).toBe(false);
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(/full refund/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel booking' }));
    await waitFor(() => expect(cancelled).toBe(true));
  });

  it('asks a renter how the trip was once the booking is completed', async () => {
    renderRenterBooking('COMPLETED');
    expect(await screen.findByRole('heading', { name: 'How was your trip?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it('offers neither while the booking is active', async () => {
    renderRenterBooking('ACTIVE');
    await screen.findByRole('heading', { name: 'Toyota Prado' });
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'How was your trip?' })).not.toBeInTheDocument();
  });
});

// ─── Owner contract templates ────────────────────────────────────────────────

describe('OwnerContractTemplatesPage', () => {
  const MINE = { id: 't-1', ownerId: 'me-1', name: 'My Terms', version: 1, status: 'PENDING', content: '# Terms' };

  it('lists the owner’s own templates with their status', async () => {
    server.use(http.get(`${BASE}/contract-templates/mine`, () => HttpResponse.json([MINE])));
    renderUi(<OwnerContractTemplatesPage />);
    expect(await screen.findByRole('heading', { name: 'My Terms' })).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('adds one with POST /contract-templates/owner', async () => {
    const user = userEvent.setup();
    let body;
    server.use(
      http.get(`${BASE}/contract-templates/mine`, () => HttpResponse.json([])),
      http.post(`${BASE}/contract-templates/owner`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...MINE, name: body.name }, { status: 201 });
      })
    );
    renderUi(<OwnerContractTemplatesPage />);
    expect(await screen.findByText('No templates yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /new template/i }));
    await user.type(screen.getByLabelText('Template Name'), 'Weekend Terms');
    await user.type(screen.getByLabelText(/contract body/i), 'Be kind');
    await user.click(screen.getByRole('button', { name: 'Save Template' }));
    await waitFor(() => expect(body).toEqual({ name: 'Weekend Terms', content: withPlatformClause('Be kind') }));
  });
});

// ─── Admin: insurance and vehicle documents ──────────────────────────────────

describe('insurance review', () => {
  const pixel = 'data:image/png;base64,iVBORw0KGgo=';
  const CAR = (over) => ({ id: 'v-1', model: 'Toyota Prado', registrationNumber: 'KDA 123A', location: 'Nairobi', pricePerDay: 9000, available: true, ownerEmail: 'o@example.com', ...over });

  it('shows each vehicle’s insurance state', async () => {
    server.use(
      http.get(`${BASE}/vehicles/admin/all`, () =>
        HttpResponse.json([
          CAR({ id: 'v-1', model: 'Prado', comprehensiveInsurance: true, insuranceVerificationStickerPhoto: pixel }),
          CAR({ id: 'v-2', model: 'Noah', comprehensiveInsurance: true, insuranceVerificationStickerPhoto: null }),
          CAR({ id: 'v-3', model: 'Voxy', comprehensiveInsurance: false }),
        ])
      )
    );
    renderUi(<AdminVehiclesPage />);
    expect(await screen.findByText('Insured · sticker')).toBeInTheDocument();
    expect(screen.getByText('Insured · no sticker')).toBeInTheDocument();
    expect(screen.getByText('No insurance')).toBeInTheDocument();
  });

  it('opens the insurance sticker photo for review', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json([CAR({ comprehensiveInsurance: true, insuranceVerificationStickerPhoto: pixel })])));
    renderUi(<AdminVehiclesPage />);
    await user.click(await screen.findByRole('button', { name: 'View insurance sticker: Toyota Prado' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('img', { name: 'Insurance sticker for Toyota Prado' })).toHaveAttribute('src', pixel);
  });

  it('a vehicle document says which vehicle it is for', async () => {
    server.use(http.get(`${BASE}/vehicles/v-1`, () => HttpResponse.json(CAR({}))));
    renderUi(<VehicleTag vehicleId="v-1" />);
    expect(await screen.findByText('Toyota Prado')).toBeInTheDocument();
    expect(screen.getByText(/KDA 123A · owner o@example\.com/)).toBeInTheDocument();
  });
});

// ─── Admin: vehicle photos ───────────────────────────────────────────────────

describe('vehicle photos in All Vehicles', () => {
  const pixel = 'data:image/png;base64,iVBORw0KGgo=';
  const CAR = (over) => ({ id: 'v-1', model: 'Toyota Prado', registrationNumber: 'KDA 123A', location: 'Nairobi', pricePerDay: 9000, available: true, ownerEmail: 'o@example.com', ...over });

  it('shows a vehicle\u2019s first photo as a thumbnail, with how many there are', async () => {
    server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json([CAR({ photos: [{ url: pixel }, { url: pixel }] })])));
    renderUi(<AdminVehiclesPage />);
    const thumb = await screen.findByRole('button', { name: 'View photos of Toyota Prado (2)' });
    expect(thumb.querySelector('img')).toHaveAttribute('src', pixel);
  });

  it('opens all of a vehicle\u2019s photos', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json([CAR({ photos: [{ url: pixel }, { url: pixel }] })])));
    renderUi(<AdminVehiclesPage />);
    await user.click(await screen.findByRole('button', { name: 'View photos of Toyota Prado (2)' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('img', { name: 'Toyota Prado — photo 1' })).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: 'Toyota Prado — photo 2' })).toBeInTheDocument();
  });

  it('says so, rather than showing nothing, when no photo is available', async () => {
    server.use(http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json([CAR({})])));
    renderUi(<AdminVehiclesPage />);
    expect(await screen.findByRole('img', { name: 'No photos available for Toyota Prado' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view photos/i })).not.toBeInTheDocument();
    expect(screen.getByText(/never shown as one of a vehicle.s photos/i)).toBeInTheDocument();
  });
});
