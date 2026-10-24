import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Spinner from '../ui/Spinner';
import ErrorBanner from '../ui/ErrorBanner';
import TypingDots from '../ui/TypingDots';
import { formatDateTime } from '../../lib/utils';
import { stripPhoneNumbers } from '../../lib/contactGuard';
import { usePhoneGuard } from '../../hooks/usePhoneGuard';
import { apiErrorMessage } from '../../lib/apiError';
import { useAuthStore } from '../../store/authStore';
import { useChatMessages, useMarkMessageRead, useSendChatMessage, useTypingIndicator, useTypingSignal } from '../../hooks/useChat';

/** The most a message can be — the backend states no limit, so this only keeps a message reasonable. */
const MAX_LENGTH = 1000;

/**
 * One conversation: the messages (mine on the right, theirs on the left), refreshed every few
 * seconds, and a box to reply. Messages from the other person are marked read as they're shown.
 * Phone numbers are stripped from what's written (as it's typed) and from everything shown, since
 * the backend doesn't enforce that rule.
 *
 * @param {string} [bookingId] — a booking's thread…
 * @param {string} [otherUserId] — …or a direct thread with this person
 * @param {string} [recipientId] — the other person's id, for the live typing indicator (`useTypingSignal`
 *   needs it even on a booking thread, where sending a *message* doesn't). Not always known yet — see
 *   ChatPage.jsx's own fallback chain for where it comes from.
 */
export default function ChatThread({ bookingId, otherUserId, recipientId }) {
  const myId = useAuthStore((s) => s.user?.id);
  const { data: messages = [], isLoading, isError, refetch } = useChatMessages({ bookingId, otherUserId });
  const send = useSendChatMessage({ bookingId, otherUserId });
  const markRead = useMarkMessageRead();
  const theyAreTyping = useTypingIndicator({ bookingId, otherUserId });
  const typingSignal = useTypingSignal({ recipientId: recipientId || otherUserId, bookingId });

  const [draft, setDraft] = useState('');
  const guard = usePhoneGuard();
  const bottomRef = useRef(null);
  const markedRef = useRef(new Set());

  // Mark what the other person sent as read, once each.
  useEffect(() => {
    messages.forEach((m) => {
      if (!m.read && m.senderId !== myId && !markedRef.current.has(m.id)) {
        markedRef.current.add(m.id);
        markRead.mutate(m.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, myId]);

  // Keep the newest message in view — also when sending starts or the other person starts typing, so
  // either in-flight bubble below is visible the instant it appears.
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length, send.isPending, theyAreTyping]);

  function handleChange(e) {
    setDraft(guard.filter(e.target.value));
    typingSignal.notify();
  }

  function handleSend(e) {
    e.preventDefault();
    const message = stripPhoneNumbers(draft).text.trim();
    if (!message || send.isPending) return;
    typingSignal.stop();
    send.mutate(message, {
      onSuccess: () => {
        setDraft('');
        guard.reset();
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" label="Loading messages" />
      </div>
    );
  }

  if (isError) {
    return <ErrorBanner message="We couldn't load this conversation." onRetry={refetch} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <ul
        aria-label="Messages"
        aria-live="polite"
        className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-black/[0.03] p-4 min-h-[16rem] max-h-[55vh] overflow-y-auto"
      >
        {messages.length === 0 && <li className="m-auto text-sm text-muted text-center">No messages yet — say hello.</li>}
        {messages.map((m) => {
          const mine = m.senderId === myId;
          return (
            <li key={m.id} className={`flex flex-col max-w-[80%] ${mine ? 'self-end items-end' : 'self-start items-start'}`}>
              <span
                className={`rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words ${
                  mine ? 'bg-accent/15 border border-accent/40 text-ink' : 'bg-ink/5 border border-ink/10 text-ink'
                }`}
              >
                {stripPhoneNumbers(m.message).text}
              </span>
              <span className="text-[11px] text-muted mt-1">
                {mine ? 'You' : m.senderName || 'Them'}
                {m.createdAt ? ` · ${formatDateTime(m.createdAt)}` : ''}
                {mine && m.read ? ' · Seen' : ''}
              </span>
            </li>
          );
        })}
        {send.isPending && (
          <li className="flex flex-col max-w-[80%] self-end items-end">
            <span className="rounded-2xl px-4 py-2 text-sm bg-accent/15 border border-accent/40 text-ink">
              <TypingDots label="Sending message" />
            </span>
          </li>
        )}
        {theyAreTyping && (
          <li className="flex flex-col max-w-[80%] self-start items-start">
            <span className="rounded-2xl px-4 py-2 text-sm bg-ink/5 border border-ink/10 text-ink">
              <TypingDots label="Typing" />
            </span>
          </li>
        )}
        <li ref={bottomRef} aria-hidden="true" />
      </ul>

      <form onSubmit={handleSend} className="flex flex-col gap-3" noValidate>
        <Textarea
          label="Your message"
          name="message"
          rows={3}
          maxLength={MAX_LENGTH}
          value={draft}
          onChange={handleChange}
          onBlur={typingSignal.stop}
          hint={guard.notice}
          error={send.isError ? apiErrorMessage(send.error, "Couldn't send your message. Please try again.") : undefined}
        />
        <Button type="submit" loading={send.isPending} disabled={!draft.trim()} className="self-end">
          <Send size={15} aria-hidden="true" />
          Send
        </Button>
      </form>
    </div>
  );
}
