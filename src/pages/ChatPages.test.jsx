// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthStore } from '../store/authStore';
import MessagesPage from './MessagesPage';
import ChatPage from './ChatPage';

const BASE = `${import.meta.env.VITE_API_BASE_URL}/api/v1`;

beforeAll(() => {
  // jsdom has no layout, so scrollIntoView doesn't exist.
  Element.prototype.scrollIntoView = () => {};
});

/** jsdom has no real EventSource — a minimal stand-in so `useTypingIndicator` has something to construct and
 * tests can fire a 'typing' event on it directly, the same way the real SSE stream would deliver one. */
class MockEventSource {
  constructor(url) {
    this.url = url;
    this.listeners = {};
    MockEventSource.instances.push(this);
  }
  addEventListener(type, cb) {
    this.listeners[type] = cb;
  }
  emit(type, data) {
    this.listeners[type]?.({ data: JSON.stringify(data) });
  }
  close() {
    this.closed = true;
  }
}
MockEventSource.instances = [];

const ME = 'u1';
const THEM = 'u2';

const CONVERSATION = {
  otherUserId: THEM,
  otherUserName: 'Ann Owner',
  otherUserEmail: 'ann@example.com',
  bookingId: 'b1',
  vehicleId: 'v1',
  vehicleModel: 'Toyota Prado',
  lastMessage: 'See you at 9. My number is 0712345678',
  lastMessageTime: '2030-01-02T10:00:00Z',
  unreadCount: 2,
};

const msg = (id, from, text, extra = {}) => ({
  id,
  senderId: from,
  senderName: from === ME ? 'Me Renter' : 'Ann Owner',
  recipientId: from === ME ? THEM : ME,
  recipientName: from === ME ? 'Ann Owner' : 'Me Renter',
  bookingId: 'b1',
  vehicleModel: 'Toyota Prado',
  message: text,
  read: false,
  createdAt: `2030-01-02T10:0${id.slice(-1)}:00Z`,
  ...extra,
});

function signIn() {
  act(() => useAuthStore.setState({ token: 't', user: { id: ME, email: 'me@example.com', roles: ['RENTER'] } }));
}

function renderAt(route) {
  return render(
    <HelmetProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/booking/:bookingId" element={<ChatPage />} />
            <Route path="/messages/user/:otherUserId" element={<ChatPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

afterEach(() => {
  act(() => useAuthStore.setState({ token: null, user: null }));
});

describe('Messages — the conversation list', () => {
  it('lists conversations with who, the vehicle, the last message and the unread count', async () => {
    signIn();
    server.use(http.get(`${BASE}/chat/conversations`, () => HttpResponse.json([CONVERSATION])));
    renderAt('/messages');

    const row = await screen.findByRole('link', { name: /ann owner/i });
    expect(row).toHaveAttribute('href', '/messages/booking/b1');
    expect(within(row).getByText('Toyota Prado')).toBeInTheDocument();
    expect(within(row).getByLabelText('2 unread')).toBeInTheDocument();
  });

  it('never shows a phone number in the last message', async () => {
    signIn();
    server.use(http.get(`${BASE}/chat/conversations`, () => HttpResponse.json([CONVERSATION])));
    renderAt('/messages');
    const row = await screen.findByRole('link', { name: /ann owner/i });
    expect(row).toHaveTextContent('[phone number removed]');
    expect(row).not.toHaveTextContent('0712');
  });

  it('opens a direct conversation (no booking) by the other person', async () => {
    signIn();
    server.use(http.get(`${BASE}/chat/conversations`, () => HttpResponse.json([{ ...CONVERSATION, bookingId: undefined }])));
    renderAt('/messages');
    expect(await screen.findByRole('link', { name: /ann owner/i })).toHaveAttribute('href', `/messages/user/${THEM}`);
  });

  it('shows an empty state', async () => {
    signIn();
    renderAt('/messages');
    expect(await screen.findByText(/no conversations yet/i)).toBeInTheDocument();
  });
});

describe('Chat — a booking thread', () => {
  it('shows the messages, mine on the right and theirs on the left, oldest first', async () => {
    signIn();
    server.use(
      http.get(`${BASE}/bookings/b1/messages`, () => HttpResponse.json([msg('m2', ME, 'Thanks!', { read: true }), msg('m1', THEM, 'Hello there')])),
      http.get(`${BASE}/chat/conversations`, () => HttpResponse.json([CONVERSATION]))
    );
    renderAt('/messages/booking/b1');

    const list = await screen.findByRole('list', { name: 'Messages' });
    const items = within(list).getAllByRole('listitem').filter((li) => li.textContent);
    expect(items[0]).toHaveTextContent('Hello there');
    expect(items[1]).toHaveTextContent('Thanks!');
    expect(items[1].className).toContain('self-end');
    expect(items[0].className).toContain('self-start');
    expect(await screen.findByRole('heading', { name: 'Ann Owner' })).toBeInTheDocument();
  });

  it('marks the other person’s unread messages as read, once each, and not my own', async () => {
    signIn();
    const marked = [];
    server.use(
      http.get(`${BASE}/bookings/b1/messages`, () => HttpResponse.json([msg('m1', THEM, 'Hello'), msg('m2', ME, 'Hi')])),
      http.put(`${BASE}/chat/messages/:id/read`, ({ params }) => {
        marked.push(params.id);
        return HttpResponse.json({});
      })
    );
    renderAt('/messages/booking/b1');
    await screen.findByText('Hello');
    await waitFor(() => expect(marked).toEqual(['m1']));
  });

  it('never shows a phone number a message contains', async () => {
    signIn();
    server.use(http.get(`${BASE}/bookings/b1/messages`, () => HttpResponse.json([msg('m1', THEM, 'ring me on +254 733 111 222')])));
    renderAt('/messages/booking/b1');
    const list = await screen.findByRole('list', { name: 'Messages' });
    expect(list).toHaveTextContent('[phone number removed]');
    expect(list).not.toHaveTextContent('254');
  });

  it('sends a reply to the booking’s thread', async () => {
    const user = userEvent.setup();
    signIn();
    let body;
    const stored = [];
    server.use(
      http.get(`${BASE}/bookings/b1/messages`, () => HttpResponse.json(stored)),
      http.post(`${BASE}/bookings/b1/messages`, async ({ request }) => {
        body = await request.json();
        const sent = msg('m3', ME, body.message);
        stored.push(sent);
        return HttpResponse.json(sent);
      })
    );
    renderAt('/messages/booking/b1');
    await screen.findByText(/no messages yet/i);

    await user.type(screen.getByLabelText(/your message/i), 'What time is pickup?');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(body).toEqual({ message: 'What time is pickup?' }));
    expect(await screen.findByText('What time is pickup?')).toBeInTheDocument();
    expect(screen.getByLabelText(/your message/i)).toHaveValue('');
  });

  it('strips a phone number as it is typed, says so, and never sends it', async () => {
    const user = userEvent.setup();
    signIn();
    let body;
    server.use(
      http.get(`${BASE}/bookings/b1/messages`, () => HttpResponse.json([])),
      http.post(`${BASE}/bookings/b1/messages`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(msg('m3', ME, body.message));
      })
    );
    renderAt('/messages/booking/b1');
    await screen.findByText(/no messages yet/i);

    const box = screen.getByLabelText(/your message/i);
    await user.type(box, 'call 0712345678 now');
    expect(box.value).not.toMatch(/07\d/);
    expect(screen.getByRole('status')).toHaveTextContent(/phone numbers can't be shared here/i);
    // ...and the notice stays while they carry on typing words.
    expect(screen.getByRole('status')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(body).toBeDefined());
    expect(body.message).not.toMatch(/07\d|0712/);
    expect(body.message).toContain('[phone number removed]');
  });

  it('shows a sending indicator while a reply is in flight, and clears it once sent', async () => {
    const user = userEvent.setup();
    signIn();
    const stored = [];
    server.use(
      http.get(`${BASE}/bookings/b1/messages`, () => HttpResponse.json(stored)),
      http.post(`${BASE}/bookings/b1/messages`, async ({ request }) => {
        const body = await request.json();
        await new Promise((resolve) => setTimeout(resolve, 50));
        const sent = msg('m3', ME, body.message);
        stored.push(sent);
        return HttpResponse.json(sent);
      })
    );
    renderAt('/messages/booking/b1');
    await screen.findByText(/no messages yet/i);

    await user.type(screen.getByLabelText(/your message/i), 'On my way');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(await screen.findByRole('status', { name: /sending message/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('status', { name: /sending message/i })).not.toBeInTheDocument());
    expect(await screen.findByText('On my way')).toBeInTheDocument();
  });

  it('will not send an empty message', async () => {
    signIn();
    server.use(http.get(`${BASE}/bookings/b1/messages`, () => HttpResponse.json([])));
    renderAt('/messages/booking/b1');
    await screen.findByText(/no messages yet/i);
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it("shows the server's reason when sending fails", async () => {
    const user = userEvent.setup();
    signIn();
    server.use(
      http.get(`${BASE}/bookings/b1/messages`, () => HttpResponse.json([])),
      http.post(`${BASE}/bookings/b1/messages`, () => HttpResponse.json({ status: 400, message: 'Cannot send message to yourself' }, { status: 400 }))
    );
    renderAt('/messages/booking/b1');
    await screen.findByText(/no messages yet/i);
    await user.type(screen.getByLabelText(/your message/i), 'hi');
    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(await screen.findByText(/cannot send message to yourself/i)).toBeInTheDocument();
  });
});

describe('Chat — a direct thread', () => {
  it('reads and writes through /chat/messages with the other person’s id', async () => {
    const user = userEvent.setup();
    signIn();
    let asked;
    let body;
    server.use(
      http.get(`${BASE}/chat/messages`, ({ request }) => {
        asked = new URL(request.url).searchParams.get('otherUserId');
        return HttpResponse.json([msg('m1', THEM, 'Hi Me')]);
      }),
      http.post(`${BASE}/chat/messages`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(msg('m2', ME, body.message));
      })
    );
    renderAt(`/messages/user/${THEM}`);
    await screen.findByText('Hi Me');
    expect(asked).toBe(THEM);

    await user.type(screen.getByLabelText(/your message/i), 'Hello');
    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(body).toEqual({ recipientId: THEM, message: 'Hello' }));
  });
});

describe('Chat — live typing indicator', () => {
  beforeEach(() => {
    MockEventSource.instances.length = 0;
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows "typing…" the moment the stream says the other person is, and clears it when they stop', async () => {
    signIn();
    server.use(http.get(`${BASE}/chat/messages`, () => HttpResponse.json([msg('m1', THEM, 'Hi Me')])));
    renderAt(`/messages/user/${THEM}`);
    await screen.findByText('Hi Me');

    const source = MockEventSource.instances.at(-1);
    expect(source.url).toContain('/chat/typing/stream?access_token=t');

    act(() => source.emit('typing', { senderId: THEM, typing: true }));
    expect(await screen.findByRole('status', { name: /^typing$/i })).toBeInTheDocument();

    act(() => source.emit('typing', { senderId: THEM, typing: false }));
    await waitFor(() => expect(screen.queryByRole('status', { name: /^typing$/i })).not.toBeInTheDocument());
  });

  it('ignores a typing event meant for a different person', async () => {
    signIn();
    server.use(http.get(`${BASE}/chat/messages`, () => HttpResponse.json([msg('m1', THEM, 'Hi Me')])));
    renderAt(`/messages/user/${THEM}`);
    await screen.findByText('Hi Me');

    act(() => MockEventSource.instances.at(-1).emit('typing', { senderId: 'someone-else', typing: true }));
    expect(screen.queryByRole('status', { name: /^typing$/i })).not.toBeInTheDocument();
  });

  it('signals typing once while the reply box is being typed in, then signals stopped after sending', async () => {
    const user = userEvent.setup();
    signIn();
    const calls = [];
    server.use(
      http.get(`${BASE}/chat/messages`, () => HttpResponse.json([])),
      http.post(`${BASE}/chat/typing`, ({ request }) => {
        calls.push(Object.fromEntries(new URL(request.url).searchParams));
        return HttpResponse.json({});
      }),
      http.post(`${BASE}/chat/messages`, async ({ request }) => HttpResponse.json(msg('m2', ME, (await request.json()).message)))
    );
    renderAt(`/messages/user/${THEM}`);
    await screen.findByText(/no messages yet/i);

    await user.type(screen.getByLabelText(/your message/i), 'Hey there');
    await waitFor(() => expect(calls).toContainEqual({ recipientId: THEM, typing: 'true' }));
    // Typing more while already signaled doesn't re-signal — only the one call above.
    expect(calls.filter((c) => c.typing === 'true')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(calls).toContainEqual({ recipientId: THEM, typing: 'false' }));
  });
});
