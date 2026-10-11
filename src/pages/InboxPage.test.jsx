// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import InboxPage from './InboxPage';
import NotificationBell from '../components/layout/NotificationBell';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

const NEW_BOOKING = {
  id: 'n1',
  title: 'New booking request',
  message: 'renter@example.com booked your Toyota Prado. Call me on 0712 345 678',
  type: 'NEW_BOOKING',
  referenceId: 'b1',
  referenceType: 'BOOKING',
  read: false,
  createdAt: '2030-01-02T10:00:00Z',
};
const OLDER = { ...NEW_BOOKING, id: 'n2', title: 'Booking confirmed', type: 'BOOKING_CONFIRMED', referenceId: 'b2', read: true, createdAt: '2030-01-01T10:00:00Z' };

function signIn(roles) {
  act(() => useAuthStore.setState({ token: 't', user: { id: 'u1', email: 'me@example.com', roles } }));
}

/** Serves the notifications and lets the tests see the read calls. */
function serve(list) {
  const state = { list: list.map((n) => ({ ...n })), readIds: [], readAll: 0 };
  server.use(
    http.get(`${BASE}/notifications`, () => HttpResponse.json(state.list)),
    http.get(`${BASE}/notifications/unread-count`, () => HttpResponse.json({ unreadCount: state.list.filter((n) => !n.read).length })),
    http.put(`${BASE}/notifications/read-all`, () => {
      state.readAll += 1;
      state.list = state.list.map((n) => ({ ...n, read: true }));
      return HttpResponse.json({ message: 'ok' });
    }),
    http.put(`${BASE}/notifications/:id/read`, ({ params }) => {
      state.readIds.push(params.id);
      state.list = state.list.map((n) => (n.id === params.id ? { ...n, read: true } : n));
      return HttpResponse.json(state.list.find((n) => n.id === params.id));
    })
  );
  return state;
}

function renderApp() {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/inbox']}>
          <NotificationBell />
          <Routes>
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/owner/bookings/:id" element={<p>Owner booking page</p>} />
            <Route path="/dashboard/bookings/:id" element={<p>Renter booking page</p>} />
            <Route path="/messages" element={<p>Messages page</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
});

describe('Inbox — the backend’s notifications', () => {
  it('lists them newest first, unread ones marked, and the bell shows the unread count', async () => {
    signIn(['OWNER']);
    serve([OLDER, NEW_BOOKING]);
    renderApp();

    const list = await screen.findByRole('list', { name: 'Notifications' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('New booking request');
    expect(rows[1]).toHaveTextContent('Booking confirmed');
    // An owner-only account reads every booking notification as its own side's.
    expect(within(rows[0]).getByRole('link', { name: 'Review Booking' })).toHaveAttribute('href', '/owner/bookings/b1');
    expect(within(list).getByText(/\(unread\)/i)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Inbox, 1 unread' })).toBeInTheDocument();
  });

  it("never shows a phone number in a notification", async () => {
    signIn(['OWNER']);
    serve([NEW_BOOKING]);
    renderApp();
    const item = await screen.findByText(/booked your toyota prado/i);
    expect(item).toHaveTextContent('[phone number removed]');
    expect(item).not.toHaveTextContent('0712');
  });

  it('opening one marks it read on the backend and goes to the owner booking', async () => {
    const user = userEvent.setup();
    signIn(['OWNER']);
    const state = serve([NEW_BOOKING]);
    renderApp();

    await user.click(await screen.findByRole('link', { name: 'Review Booking' }));

    expect(await screen.findByText('Owner booking page')).toBeInTheDocument();
    await waitFor(() => expect(state.readIds).toEqual(['n1']));
  });

  it("a renter's booking notification goes to their own booking page", async () => {
    const user = userEvent.setup();
    signIn(['RENTER']);
    serve([{ ...OLDER, read: false }]);
    renderApp();
    await user.click(await screen.findByRole('link', { name: 'View Booking' }));
    expect(await screen.findByText('Renter booking page')).toBeInTheDocument();
  });

  it('"Mark all as read" calls the backend once and clears the unread state', async () => {
    const user = userEvent.setup();
    signIn(['OWNER']);
    const state = serve([NEW_BOOKING, { ...NEW_BOOKING, id: 'n3', referenceId: 'b3' }]);
    renderApp();

    await screen.findAllByRole('link', { name: 'Review Booking' });
    await user.click(screen.getByRole('button', { name: /mark all as read/i }));

    await waitFor(() => expect(state.readAll).toBe(1));
    await waitFor(() => expect(screen.queryByRole('button', { name: /mark all as read/i })).not.toBeInTheDocument());
    expect(screen.queryByText(/\(unread\)/i)).not.toBeInTheDocument();
  });

  it('shows an empty state and an error state', async () => {
    signIn(['RENTER']);
    serve([]);
    const first = renderApp();
    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument();
    first.unmount();

    server.use(http.get(`${BASE}/notifications`, () => new HttpResponse(null, { status: 500 })));
    renderApp();
    expect(await screen.findByText(/couldn't load your notifications/i)).toBeInTheDocument();
  });
});

describe('the bell', () => {
  it('is not shown to a visitor', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <NotificationBell />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.queryByRole('link', { name: /inbox|messages/i })).not.toBeInTheDocument();
  });

  it('also links to Messages, with the unread message count', async () => {
    signIn(['RENTER']);
    server.use(http.get(`${BASE}/chat/conversations`, () => HttpResponse.json([{ otherUserId: 'x', bookingId: 'b1', unreadCount: 4 }])));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <NotificationBell />
        </MemoryRouter>
      </QueryClientProvider>
    );
    const link = await screen.findByRole('link', { name: 'Messages, 4 unread' });
    expect(link).toHaveAttribute('href', '/messages');
  });
});
