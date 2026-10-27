import { http, HttpResponse } from 'msw';
import { useAuthStore } from '../store/authStore';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

/**
 * Builds a structurally-valid (but unsigned) JWT carrying the same claim
 * shape the real backend embeds — confirmed against a real token: `userId`,
 * `email`, `roles`, `enabled`, `permissions`. Used so `decodeJwt` (see
 * src/lib/jwt.js) has something real to decode in tests, matching
 * `AuthResponse`'s actual shape (`{ tokenType, accessToken, expiresIn }` —
 * no `user` object).
 */
function mockJwt(claims) {
  const base64url = (obj) =>
    Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'HS384' })}.${base64url(claims)}.mock-signature`;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authHandlers = [
  http.post(`${BASE}/auth/register`, () =>
    HttpResponse.json({ message: 'Registration successful. Check your email.' }, { status: 201 })
  ),

  http.post(`${BASE}/auth/verify-email`, () =>
    HttpResponse.json({ message: 'Email verified successfully.' })
  ),

  http.post(`${BASE}/auth/verify-whatsapp`, () => HttpResponse.json({ message: 'WhatsApp verified successfully.' })),
  http.post(`${BASE}/auth/send-whatsapp-code`, () => new HttpResponse(null, { status: 200 })),

  // Signing out revokes the refresh token (authStore's clearAuth); renewing answers a new pair (refreshSession).
  http.post(`${BASE}/auth/logout`, () => new HttpResponse(null, { status: 200 })),
  http.post(`${BASE}/auth/refresh`, () =>
    HttpResponse.json({ tokenType: 'Bearer', accessToken: mockJwt({ userId: '1', email: 'test@example.com', roles: ['RENTER'], enabled: true, permissions: [] }), refreshToken: 'mock-refresh-token', expiresIn: 3600000 })
  ),

  http.post(`${BASE}/auth/login`, () =>
    HttpResponse.json({
      tokenType: 'Bearer',
      accessToken: mockJwt({
        userId: '1',
        email: 'test@example.com',
        roles: ['RENTER'],
        enabled: true,
        permissions: [],
      }),
      expiresIn: 3600000,
      refreshToken: 'mock-refresh-token',
    })
  ),

  http.post(`${BASE}/auth/verify-2fa`, () =>
    HttpResponse.json({
      tokenType: 'Bearer',
      accessToken: mockJwt({
        userId: '1',
        email: 'test@example.com',
        roles: ['RENTER'],
        enabled: true,
        permissions: [],
      }),
      expiresIn: 3600000,
    })
  ),
];

// ─── Users ───────────────────────────────────────────────────────────────────

export const userHandlers = [
  // Echoes whatever's already in authStore (roles included) rather than a
  // hardcoded role — tests that sign in as OWNER/ADMIN via
  // `useAuthStore.setState(...)` shouldn't have this mock silently flip
  // them back to RENTER once `useSyncCurrentUser` (see useProfile.js)
  // fetches this in the background, since that's a real app-wide effect
  // mounted at the root, not something individual tests opt into.
  http.get(`${BASE}/users/me`, () => {
    const current = useAuthStore.getState().user;
    return HttpResponse.json({
      id: current?.id || '1',
      email: current?.email || 'test@example.com',
      firstName: current?.firstName || 'Test',
      lastName: current?.lastName || 'User',
      enabled: true,
      roles: current?.roles || ['RENTER'],
    });
  }),

  http.patch(`${BASE}/users/me`, async ({ request }) => {
    const current = useAuthStore.getState().user;
    const body = await request.json();
    return HttpResponse.json({ id: '1', email: 'test@example.com', roles: current?.roles || ['RENTER'], ...body });
  }),

  http.put(`${BASE}/users/me/owner-profile`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '1', email: 'test@example.com', roles: ['OWNER'], ...body });
  }),
];

// ─── Vehicles ────────────────────────────────────────────────────────────────

export const vehicleHandlers = [
  http.get(`${BASE}/vehicles`, () =>
    HttpResponse.json({
      content: [
        {
          id: 'v1',
          model: 'Toyota Noah',
          location: 'Nairobi',
          dailyPrice: 8000,
          capacity: 7,
          fuelType: 'PETROL',
          transmissionType: 'AUTOMATIC',
          selfDrive: true,
          chauffeured: true,
          rating: 4.8,
          available: true,
          tier: 'STANDARD',
          photos: [],
        },
      ],
      totalElements: 1,
      totalPages: 1,
      number: 0,
    })
  ),

  http.get(`${BASE}/vehicles/:id`, ({ params }) =>
    HttpResponse.json({
      id: params.id,
      model: 'Toyota Prado',
      location: 'Nairobi',
      dailyPrice: 15000,
      capacity: 5,
      fuelType: 'DIESEL',
      transmissionType: 'AUTOMATIC',
      selfDrive: false,
      chauffeured: true,
      rating: 5.0,
      available: true,
      tier: 'EXECUTIVE',
      description: 'Premium VIP vehicle for executive travel.',
      photos: [],
    })
  ),

  http.post(`${BASE}/vehicles/create-vehicle`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'new-vehicle-id',
      ownerEmail: 'owner@example.com',
      rating: 0,
      available: true,
      ...body,
    });
  }),

  http.put(`${BASE}/vehicles/:id`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: params.id, ownerEmail: 'owner@example.com', rating: 0, ...body });
  }),

  http.post(`${BASE}/vehicles/:id/photos`, ({ params }) =>
    HttpResponse.json({
      id: 'photo-1',
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
      url: `https://example.com/vehicles/${params.id}/photo.jpg`,
    })
  ),
];

// ─── Documents ───────────────────────────────────────────────────────────────

export const documentHandlers = [
  // Shapes match the live backend's `DocumentResponse` (documentType / reviewStatus).
  http.get(`${BASE}/documents/me`, () =>
    HttpResponse.json([
      { id: 'd1', documentType: 'NATIONAL_ID', reviewStatus: 'APPROVED', createdAt: '2026-09-01T10:00:00Z' },
    ])
  ),

  http.post(`${BASE}/documents`, ({ request }) => {
    const documentType = new URL(request.url).searchParams.get('documentType');
    return HttpResponse.json({ id: 'd2', documentType, reviewStatus: 'PENDING' }, { status: 201 });
  }),
];

// ─── Bookings ────────────────────────────────────────────────────────────────

export const bookingHandlers = [
  http.post(`${BASE}/bookings/create`, () =>
    HttpResponse.json({
      id: 'b1',
      vehicleId: 'v1',
      startTime: '2026-10-01T09:00:00+03:00',
      endTime: '2026-10-04T09:00:00+03:00',
      numberOfDays: 3,
      bookingMode: 'CHAUFFEURED',
      tripType: 'AIRPORT_TRANSFER',
      renterNotes: 'Please arrive 10 minutes early.',
      status: 'PENDING',
      totalCost: 45000,
    }, { status: 201 })
  ),

  http.get(`${BASE}/bookings/mine`, () =>
    HttpResponse.json([
      {
        id: 'b1',
        vehicleModel: 'Toyota Noah',
        startTime: '2026-10-01T09:00:00+03:00',
        endTime: '2026-10-04T09:00:00+03:00',
        numberOfDays: 3,
        status: 'CONFIRMED',
        totalCost: 45000,
        tripType: 'AIRPORT_TRANSFER',
      },
    ])
  ),

  http.get(`${BASE}/bookings/:id`, ({ params }) =>
    HttpResponse.json({
      id: params.id,
      vehicleModel: 'Toyota Noah',
      startTime: '2026-10-01T09:00:00+03:00',
      endTime: '2026-10-04T09:00:00+03:00',
      numberOfDays: 3,
      status: 'CONFIRMED',
      totalCost: 45000,
      tripType: 'AIRPORT_TRANSFER',
      renterNotes: 'Please arrive 10 minutes early.',
    })
  ),

  http.get(`${BASE}/bookings/owner`, () => HttpResponse.json([])),

  http.put(`${BASE}/bookings/:id/chauffeur`, () =>
    HttpResponse.json({ message: 'Chauffeur assigned.' })
  ),

  // vehicle-handover-controller — confirmed against the live OpenAPI spec 2026-10-02 (docs/backend-requests.md item 22).
  http.get(`${BASE}/handovers/bookings/:bookingId`, () => HttpResponse.json([])),
  http.post(`${BASE}/handovers/bookings/:bookingId/pickup`, ({ params }) =>
    HttpResponse.json({ id: 'ho-1', bookingId: params.bookingId, type: 'PICKUP', bookingStatus: 'ACTIVE' })
  ),
  http.post(`${BASE}/handovers/bookings/:bookingId/dropoff`, ({ params }) =>
    HttpResponse.json({ id: 'ho-2', bookingId: params.bookingId, type: 'DROPOFF', bookingStatus: 'COMPLETED' })
  ),

  // booking-policy-controller — confirmed against the live OpenAPI spec 2026-10-02 (docs/backend-requests.md
  // item 24). A generous default policy so tests exercising "Cancel booking" see it allowed by default.
  http.get(`${BASE}/booking-policies/bookings/:bookingId/effective`, () =>
    HttpResponse.json({
      freeCancellationWindowHours: 48,
      cancellationDeadlineHours: 1,
      lateCancellationRefundPct: 50,
      postponementAllowed: true,
      postponementDeadlineHours: 24,
      maxPostponements: 1,
    })
  ),
  http.post(`${BASE}/booking-policies/bookings/:bookingId/cancel`, ({ params }) =>
    HttpResponse.json({
      bookingId: params.bookingId,
      bookingStatus: 'CANCELLED',
      paidAmount: 0,
      refundAmount: 0,
      refundPercent: 100,
      message: 'Booking cancelled.',
    })
  ),

  // platform-settings-controller — confirmed against the live OpenAPI spec 2026-10-25 (docs/backend-requests.md
  // item 26; it was `/platform-settings/commission` before). GET needs auth but is readable by any signed-in role; PUT 403s for a non-admin token in reality,
  // left unenforced here since nothing in these tests exercises it as a non-admin.
  http.get(`${BASE}/platform-settings`, () =>
    HttpResponse.json({
      id: 's1', commissionRatePct: 1, botAssistantEnabled: true,
      supportPhone: '+254 712 345 678', whatsapp: '+254 712 345 678', supportEmail: 'bookings@ramellianexecutivetravels.co.ke',
      address: 'Westlands, Nairobi', instagram: '@ramellian',
    })),
  // Public (live spec 2026-10-26): whether the in-app assistant is on.
  http.get(`${BASE}/bot/status`, () => HttpResponse.json({ enabled: true })),
  http.put(`${BASE}/platform-settings`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 's1', ...body });
  }),
  http.put(`${BASE}/platform-settings/bot`, async ({ request }) => {
    const { enabled } = await request.json();
    return HttpResponse.json({ id: 's1', commissionRatePct: 1, botAssistantEnabled: enabled });
  }),

  // Added 2026-09-27 (docs/backend-requests.md items 1 & 3), response shape updated 2026-10-03 — confirmed
  // live against the real backend: public (no auth needed), `baseAmount` is `numberOfDays * pricePerDay`,
  // `totalAmount` is `baseAmount + platformFee`.
  http.post(`${BASE}/bookings/quote`, async ({ request }) => {
    const { vehicleId } = await request.json();
    return HttpResponse.json({ vehicleId, numberOfDays: 3, pricePerDay: 15000, baseAmount: 45000, platformFee: 4500, totalAmount: 49500 });
  }),

  // Confirmed live: requires auth (403 without a token) — matches `POST /bookings/create`.
  http.post(`${BASE}/bookings/create-batch`, async ({ request }) => {
    const { bookings } = await request.json();
    return HttpResponse.json(
      {
        groupId: 'g1',
        status: 'PENDING',
        totalEstimatedAmount: bookings.length * 45000,
        bookings: bookings.map((b, i) => ({ id: `b${i + 1}`, vehicleId: b.vehicleId, status: 'PENDING', numberOfDays: 3, estimatedAmount: 45000, ...b })),
      },
      { status: 201 }
    );
  }),
];

// ─── Booking leads (docs/backend-requests.md item 4) ──────────────────────────
// Confirmed live: public (no auth needed) — captures a visitor's contact + a vehicle they're interested in,
// before they have an account.
export const bookingLeadHandlers = [
  http.post(`${BASE}/booking-leads`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'lead1', createdAt: '2026-09-27T10:00:00Z', ...body }, { status: 201 });
  }),
];

// ─── Payments & Contracts ────────────────────────────────────────────────────

export const paymentHandlers = [
  http.post(`${BASE}/payments/bookings/:bookingId/contract/draft`, ({ params }) =>
    HttpResponse.json({
      contractId: 'c1',
      bookingId: params.bookingId,
      contractText: 'This is the rental agreement between Ramellian Executive Travels and the renter...',
    })
  ),

  http.post(`${BASE}/payments/bookings/:bookingId/contract/accept`, () =>
    HttpResponse.json({ message: 'Contract accepted.' })
  ),

  http.post(`${BASE}/payments/pesapal/bookings/:bookingId/checkout`, ({ params }) =>
    HttpResponse.json({
      redirectUrl: `https://pay.pesapal.com/checkout?booking=${params.bookingId}`,
      orderTrackingId: 'mock-tracking-id',
    })
  ),

  // Matches the real backend's own default: a booking with no checkout ever attempted answers 404
  // "Payment not found" (confirmed live), not a made-up status — tests that need a real payment status
  // override this explicitly via `server.use`.
  http.get(`${BASE}/payments/pesapal/bookings/:bookingId/status`, () =>
    HttpResponse.json({ status: 404, error: 'Not Found', message: 'Payment not found', fieldErrors: {} }, { status: 404 })
  ),

  http.get(`${BASE}/payments/contracts/:contractId`, ({ params }) =>
    HttpResponse.json({
      id: params.contractId,
      contractText: 'Full contract text...',
      signed: false,
      pdfUrl: null,
    })
  ),

  // POST, not PUT — confirmed live (see useSignContract's own note): PUT 403s before reaching the
  // business logic at all, regardless of request shape.
  http.post(`${BASE}/payments/contracts/:contractId/sign`, () =>
    HttpResponse.json({ message: 'Contract signed successfully.' })
  ),

  http.get(`${BASE}/payments/contracts/:contractId/document`, ({ request }) => {
    const url = new URL(request.url);
    const signed = url.searchParams.get('signed') === 'true';
    return HttpResponse.json({ downloadUrl: `https://storage.example.com/contract-${signed ? 'signed' : 'unsigned'}.pdf` });
  }),

  // Confirmed live: requires auth (403 without a token) — one payment for every booking in the group.
  http.post(`${BASE}/payments/pesapal/booking-groups/:groupId/checkout`, ({ params }) =>
    HttpResponse.json({
      redirectUrl: `https://pay.pesapal.com/checkout?group=${params.groupId}`,
      orderTrackingId: 'mock-group-tracking-id',
    })
  ),
];

// ─── Reports ─────────────────────────────────────────────────────────────────

/** The shape of the spec's `BookingReportResponse`, with nothing in it. */
export const emptyReport = {
  generatedAt: '2026-09-24T10:00:00Z',
  totalBookings: 0, upcomingBookings: 0, activeBookings: 0, completedBookings: 0, cancelledBookings: 0, rejectedBookings: 0,
  successfulGrossAmount: 0, platformRevenue: 0, ownerPayout: 0,
  upcoming: [], active: [], completed: [], cancelled: [], rejected: [],
};

export const reportHandlers = [
  http.get(`${BASE}/bookings/reports/mine`, () => HttpResponse.json(emptyReport)),
  http.get(`${BASE}/bookings/reports/owner`, () => HttpResponse.json(emptyReport)),
  http.get(`${BASE}/bookings/reports/admin`, () => HttpResponse.json(emptyReport)),
];

// ─── Admin: users, document review, contract templates ───────────────────────

const emptyPage = { content: [], empty: true, first: true, last: true, number: 0, numberOfElements: 0, size: 20, totalElements: 0, totalPages: 0 };

export const adminHandlers = [
  http.get(`${BASE}/admin/audit-logs`, () => HttpResponse.json(emptyPage)),
  http.get(`${BASE}/vehicles/admin/all`, () => HttpResponse.json([])),
  http.get(`${BASE}/vehicles/me`, () => HttpResponse.json([])),
  http.get(`${BASE}/roles`, () => HttpResponse.json([])),
  http.get(`${BASE}/permissions`, () => HttpResponse.json([])),
  http.get(`${BASE}/audit-logs`, () => HttpResponse.json(emptyPage)),
  http.get(`${BASE}/reviews/vehicles/:id`, () => HttpResponse.json([])),
  http.get(`${BASE}/reviews/owners/:id`, () => HttpResponse.json([])),
  http.get(`${BASE}/contract-templates/mine`, () => HttpResponse.json([])),

  // Added 2026-09-27 (docs/backend-requests.md item 2) — confirmed live: public (no auth needed).
  http.get(`${BASE}/contract-templates/owners/:ownerId/active`, ({ params }) =>
    HttpResponse.json({ id: 'tmpl1', ownerId: params.ownerId, name: 'Standard Rental Agreement', version: 1, status: 'APPROVED', content: 'These are the standard rental terms...' })
  ),
  http.get(`${BASE}/users/admin`, () => HttpResponse.json([])),
  http.get(`${BASE}/documents/admin/pending`, () => HttpResponse.json([])),
  http.get(`${BASE}/contract-templates/admin`, () => HttpResponse.json([])),
  http.post(`${BASE}/contract-templates/admin`, () =>
    HttpResponse.json({ id: 'tmpl1', name: 'Standard Rental Agreement', version: 1, status: 'PENDING', content: '' }, { status: 201 })
  ),
];

// ─── All handlers combined ───────────────────────────────────────────────────

export const chatHandlers = [
  http.get(`${BASE}/notifications`, () => HttpResponse.json([])),
  http.get(`${BASE}/notifications/unread-count`, () => HttpResponse.json({ unreadCount: 0 })),
  http.get(`${BASE}/chat/conversations`, () => HttpResponse.json([])),
  http.get(`${BASE}/chat/messages`, () => HttpResponse.json([])),
];

export const handlers = [
  ...chatHandlers,
  ...authHandlers,
  ...userHandlers,
  ...vehicleHandlers,
  ...documentHandlers,
  ...bookingHandlers,
  ...paymentHandlers,
  ...reportHandlers,
  ...adminHandlers,
];
