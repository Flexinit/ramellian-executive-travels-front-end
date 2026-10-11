import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiGet, apiPost, apiPut } from '../lib/api';
import { useAuthStore } from '../store/authStore';

/**
 * Two-way chat between a renter and an owner (see the live OpenAPI spec):
 *  - `GET /chat/conversations` → ConversationResponse (otherUserId, otherUserName, otherUserEmail,
 *    bookingId, vehicleId, vehicleModel, lastMessage, lastMessageTime, unreadCount);
 *  - `GET /bookings/{id}/messages` / `POST /bookings/{id}/messages` — a booking's thread (the other
 *    person is inferred from the booking, so no recipient is needed);
 *  - `GET /chat/messages?otherUserId=` / `POST /chat/messages` — a direct thread (`recipientId` is
 *    required when there's no booking, and you can't message yourself — tested live);
 *  - `PUT /chat/messages/{id}/read`;
 *  - `GET /chat/typing/stream` (SSE) / `POST /chat/typing` — live typing indicator, described to this
 *    frontend directly rather than confirmed against the OpenAPI spec (the backend was unreachable from
 *    this session when it was added — the spec was last checked 2026-10-05 and didn't have it yet; worth
 *    re-confirming field/param names once it's reachable). Unlike everything else above, this is real-time,
 *    not polled.
 * A thread is identified by `{ bookingId }` or `{ otherUserId }`. Phone numbers are stripped by
 * the components that write and show messages (lib/contactGuard.js) — the backend doesn't enforce it.
 */

const CONVERSATIONS_KEY = ['chat', 'conversations'];
const CONVERSATION_POLL_MS = 30_000;
const THREAD_POLL_MS = 8_000;
/** How long with no further keystrokes before this person is told to have stopped typing. */
const TYPING_DEBOUNCE_MS = 2000;
/** Safety net only: clears a stuck "typing" indicator if a "stopped" event is ever lost (e.g. the other
 * person's tab closed abruptly mid-debounce) — well past TYPING_DEBOUNCE_MS so it never fires first. */
const TYPING_STALE_MS = 5000;

/** Every conversation the signed-in person is in, most recent first. */
export function useConversations() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => apiGet('/chat/conversations'),
    select: (data) =>
      (Array.isArray(data) ? [...data] : []).sort((a, b) => String(b.lastMessageTime || '').localeCompare(String(a.lastMessageTime || ''))),
    enabled: isAuthenticated,
    refetchInterval: CONVERSATION_POLL_MS,
  });
}

/** How many messages are waiting to be read, across every conversation (the number on the Messages link). */
export function useUnreadMessageCount() {
  const { data } = useConversations();
  return (data || []).reduce((sum, c) => sum + Number(c.unreadCount || 0), 0);
}

const threadKey = ({ bookingId, otherUserId }) => ['chat', 'messages', bookingId || null, otherUserId || null];

/** The messages in one thread, oldest first, refreshed every few seconds while it's open. */
export function useChatMessages({ bookingId, otherUserId }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: threadKey({ bookingId, otherUserId }),
    queryFn: () => (bookingId ? apiGet(`/bookings/${bookingId}/messages`) : apiGet('/chat/messages', { otherUserId })),
    select: (data) => (Array.isArray(data) ? [...data] : []).sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || ''))),
    enabled: isAuthenticated && !!(bookingId || otherUserId),
    refetchInterval: THREAD_POLL_MS,
  });
}

/** Sends a message into a thread; the thread and the conversation list refresh afterwards. */
export function useSendChatMessage({ bookingId, otherUserId }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message) =>
      bookingId
        ? apiPost(`/bookings/${bookingId}/messages`, { message })
        : apiPost('/chat/messages', { recipientId: otherUserId, message }),
    onSuccess: (sent) => {
      queryClient.setQueryData(threadKey({ bookingId, otherUserId }), (list) => (Array.isArray(list) && sent ? [...list, sent] : list));
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
  });
}

/** Marks a message read (`PUT /chat/messages/{id}/read`) and refreshes the unread counts. */
export function useMarkMessageRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => apiPut(`/chat/messages/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

/** Where a conversation lives in the app. */
export function conversationPath({ bookingId, otherUserId }) {
  return bookingId ? `/messages/booking/${bookingId}` : `/messages/user/${otherUserId}`;
}

/**
 * Starts a conversation with a person from scratch: `POST /chat/messages` `{ recipientId, message }` (no booking
 * needed; you can't message yourself). Pass `{ recipientId, message }`. The conversation list refreshes afterwards.
 */
export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipientId, message }) => apiPost('/chat/messages', { recipientId, message }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat'] }),
  });
}

/**
 * Live "they're typing…" state for one thread, via `GET /chat/typing/stream` (Server-Sent Events) — real-time,
 * not polled like the rest of this file. Browsers' native `EventSource` can't send an `Authorization` header,
 * so the access token rides along as a query param instead (`access_token`) — the one deliberate exception to
 * this app's usual "token only ever goes in the header" rule (see api.js's interceptor), made because there's
 * no other way to authenticate SSE from a browser without adding a polyfill dependency for it. Reconnection
 * after the backend's own 5-minute idle timeout (or any dropped connection) is the browser's native
 * `EventSource` behavior — this hook doesn't manage it.
 *
 * @param {string} [bookingId] @param {string} [otherUserId] — same thread identity as `useChatMessages`;
 *   an event for a different thread is ignored.
 * @returns {boolean} whether the other person in this thread is typing right now
 */
export function useTypingIndicator({ bookingId, otherUserId }) {
  const token = useAuthStore((s) => s.token);
  const [typing, setTyping] = useState(false);
  const staleTimerRef = useRef(null);

  useEffect(() => {
    setTyping(false);
    if (!token || typeof EventSource === 'undefined') return undefined;
    const url = `${api.defaults.baseURL}/chat/typing/stream?access_token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    source.addEventListener('typing', (e) => {
      let payload;
      try {
        payload = JSON.parse(e.data);
      } catch {
        return;
      }
      const isThisThread = bookingId ? payload.bookingId === bookingId : payload.senderId === otherUserId;
      if (!isThisThread) return;
      clearTimeout(staleTimerRef.current);
      setTyping(!!payload.typing);
      if (payload.typing) staleTimerRef.current = setTimeout(() => setTyping(false), TYPING_STALE_MS);
    });
    return () => {
      clearTimeout(staleTimerRef.current);
      source.close();
    };
  }, [token, bookingId, otherUserId]);

  return typing;
}

/** Fire-and-forget — a missed typing ping is never worth surfacing to the person typing. */
function postTyping({ recipientId, bookingId, typing }) {
  if (!recipientId) return;
  const params = new URLSearchParams({ recipientId, typing: String(typing) });
  if (bookingId) params.set('bookingId', bookingId);
  apiPost(`/chat/typing?${params.toString()}`).catch(() => {});
}

/**
 * The other half of `useTypingIndicator` — tells the backend *this* person started/stopped typing
 * (`POST /chat/typing`). Call `notify()` on every keystroke in the reply box: it signals `typing=true` once,
 * then debounces `typing=false` to `TYPING_DEBOUNCE_MS` after the last keystroke. Call `stop()` directly
 * on blur or right after sending, so the other person isn't left seeing "…" for the rest of the debounce
 * window once there's nothing left to wait for.
 *
 * @param {string} [recipientId] — the other person's id (not necessarily known yet for a booking thread
 *   with no messages and no conversation-list entry — `notify`/`stop` are harmless no-ops until it is)
 * @param {string} [bookingId]
 */
export function useTypingSignal({ recipientId, bookingId }) {
  const typingRef = useRef(false);
  const timerRef = useRef(null);

  function stop() {
    clearTimeout(timerRef.current);
    if (typingRef.current) {
      typingRef.current = false;
      postTyping({ recipientId, bookingId, typing: false });
    }
  }

  function notify() {
    if (!recipientId) return;
    if (!typingRef.current) {
      typingRef.current = true;
      postTyping({ recipientId, bookingId, typing: true });
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(stop, TYPING_DEBOUNCE_MS);
  }

  // Also stops on unmount or a thread switch — otherwise a half-finished debounce from the thread just left
  // would fire its trailing `typing=false` against the *new* recipientId/bookingId instead.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => stop, [recipientId, bookingId]);

  return { notify, stop };
}
