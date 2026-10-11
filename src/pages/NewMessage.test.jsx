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
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import MessagesPage from './MessagesPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

const ME = { id: 'me-1', email: 'felix@example.com', firstName: 'Felix', lastName: 'Admin', enabled: true, roles: ['SUPER_ADMIN'] };
const ANN = { id: 'u-2', email: 'ann@example.com', firstName: 'Ann', lastName: 'Renter', enabled: true, roles: [] };
const BEN = { id: 'u-3', email: 'ben@example.com', firstName: 'Ben', lastName: 'Owner', enabled: true, roles: ['CAR_OWNER'] };
const CAL = { id: 'u-4', email: 'cal@example.com', firstName: 'Cal', lastName: 'Off', enabled: false, roles: [] };

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderMessages() {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
        <MemoryRouter initialEntries={['/messages']}>
          <Routes>
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

const signInAs = (roles) => act(() => useAuthStore.setState({ token: 't', user: { id: 'me-1', email: 'felix@example.com', roles } }));

beforeEach(() => {
  server.use(
    http.get(`${BASE}/chat/conversations`, () => HttpResponse.json([])),
    http.get(`${BASE}/users/admin`, () => HttpResponse.json([ME, ANN, BEN, CAL]))
  );
});

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null, mode: null }));
});

describe('creating a new message', () => {
  it('an administrator has a New message button on the Messages page', async () => {
    signInAs(['ADMIN']);
    renderMessages();
    expect(await screen.findByRole('button', { name: /new message/i })).toBeInTheDocument();
    expect(await screen.findByText('Choose New message to write to someone.')).toBeInTheDocument();
  });

  it('a renter or owner does not — they have no way to look people up, and message through their bookings', async () => {
    signInAs(['RENTER']);
    renderMessages();
    await screen.findByText('No conversations yet');
    expect(screen.queryByRole('button', { name: /new message/i })).not.toBeInTheDocument();
    expect(screen.getByText(/open one of your bookings/i)).toBeInTheDocument();
  });

  it('offers everyone who can be written to — not yourself, not a switched-off account — and narrows as you type', async () => {
    signInAs(['ADMIN']);
    const user = userEvent.setup();
    renderMessages();
    await user.click(await screen.findByRole('button', { name: /new message/i }));
    const dialog = await screen.findByRole('dialog', { name: 'New message' });
    expect(await within(dialog).findByRole('radio', { name: /ann renter, ann@example.com/i })).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: /ben owner/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole('radio', { name: /felix admin/i })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('radio', { name: /cal off/i })).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('To'), 'ben');
    expect(within(dialog).queryByRole('radio', { name: /ann renter/i })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: /ben owner/i })).toBeInTheDocument();
  });

  it('needs a person and some text before it can be sent', async () => {
    signInAs(['ADMIN']);
    const user = userEvent.setup();
    renderMessages();
    await user.click(await screen.findByRole('button', { name: /new message/i }));
    const dialog = await screen.findByRole('dialog');
    const send = within(dialog).getByRole('button', { name: 'Send message' });
    expect(send).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Message'), 'Hello');
    expect(send).toBeDisabled();
    await user.click(await within(dialog).findByRole('radio', { name: /ann renter/i }));
    expect(send).toBeEnabled();
  });

  it('sends with POST /chat/messages and opens the conversation', async () => {
    signInAs(['ADMIN']);
    const user = userEvent.setup();
    let body;
    server.use(
      http.post(`${BASE}/chat/messages`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ id: 'm-1', recipientId: 'u-2', message: body.message }, { status: 201 });
      })
    );
    renderMessages();
    await user.click(await screen.findByRole('button', { name: /new message/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('radio', { name: /ann renter/i }));
    await user.type(within(dialog).getByLabelText('Message'), 'Welcome aboard');
    await user.click(within(dialog).getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(body).toEqual({ recipientId: 'u-2', message: 'Welcome aboard' }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/messages/user/u-2'));
  });

  it('removes phone numbers from what is sent', async () => {
    signInAs(['ADMIN']);
    const user = userEvent.setup();
    let body;
    server.use(http.post(`${BASE}/chat/messages`, async ({ request }) => { body = await request.json(); return HttpResponse.json({ id: 'm' }, { status: 201 }); }));
    renderMessages();
    await user.click(await screen.findByRole('button', { name: /new message/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('radio', { name: /ann renter/i }));
    await user.type(within(dialog).getByLabelText('Message'), 'Ring 0712345678');
    await user.click(within(dialog).getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(body).toBeDefined());
    expect(body.message).not.toMatch(/0712345678/);
  });

  it("shows the backend's reason and keeps the window open when it can't be sent", async () => {
    signInAs(['ADMIN']);
    const user = userEvent.setup();
    server.use(http.post(`${BASE}/chat/messages`, () => HttpResponse.json({ message: 'You cannot message this user' }, { status: 403 })));
    renderMessages();
    await user.click(await screen.findByRole('button', { name: /new message/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('radio', { name: /ann renter/i }));
    await user.type(within(dialog).getByLabelText('Message'), 'Hi');
    await user.click(within(dialog).getByRole('button', { name: 'Send message' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/you cannot message this user/i);
  });

  it('shows only the first few matches and says so', async () => {
    signInAs(['ADMIN']);
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `x-${i}`, email: `person${i}@example.com`, firstName: `Person${i}`, lastName: 'Test', enabled: true, roles: [] }));
    server.use(http.get(`${BASE}/users/admin`, () => HttpResponse.json([ME, ...many])));
    const user = userEvent.setup();
    renderMessages();
    await user.click(await screen.findByRole('button', { name: /new message/i }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findAllByRole('radio');
    expect(within(dialog).getAllByRole('radio')).toHaveLength(8);
    expect(within(dialog).getByText(/showing 8 of 12/i)).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    signInAs(['ADMIN']);
    const user = userEvent.setup();
    renderMessages();
    await user.click(await screen.findByRole('button', { name: /new message/i }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('radio', { name: /ann renter/i });
    expect(await axe(dialog)).toHaveNoViolations();
  });
});
