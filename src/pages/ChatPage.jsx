import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import ChatThread from '../components/chat/ChatThread';
import { useAuthStore } from '../store/authStore';
import { useChatMessages, useConversations } from '../hooks/useChat';

/**
 * One conversation (`/messages/booking/:bookingId` or `/messages/user/:otherUserId`) — who it's with
 * and which vehicle, then the thread. See ChatThread.
 */
export default function ChatPage() {
  const { bookingId, otherUserId } = useParams();
  const myId = useAuthStore((s) => s.user?.id);
  const { data: conversations = [] } = useConversations();
  const { data: messages = [] } = useChatMessages({ bookingId, otherUserId });

  const conversation = conversations.find((c) => (bookingId ? c.bookingId === bookingId : c.otherUserId === otherUserId));
  // The conversation list only has it once someone has written; before that, the messages name the people
  // (and, for a booking thread, give the only other way to learn who the recipient even is — see `recipientId`).
  const lastMessage = messages[messages.length - 1];
  const otherName =
    conversation?.otherUserName ||
    (lastMessage && (lastMessage.senderId === myId ? lastMessage.recipientName : lastMessage.senderName)) ||
    'Conversation';
  const vehicle = conversation?.vehicleModel || lastMessage?.vehicleModel;
  // Who the typing indicator is with — `otherUserId` already answers this for a direct thread; a booking
  // thread has no recipient id of its own (messages there don't need one, the backend infers it from the
  // booking), so it's read from the conversation list, falling back to whichever party in the last message
  // isn't me. Stays undefined for a booking with zero messages and no conversation-list entry yet — harmless,
  // since `useTypingSignal` no-ops without one.
  const recipientId = otherUserId || conversation?.otherUserId || (lastMessage && (lastMessage.senderId === myId ? lastMessage.recipientId : lastMessage.senderId));

  return (
    <PageWrapper className="max-w-3xl">
      <PageTitle title={`Chat with ${otherName}`} />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Link to="/messages" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink w-fit focus-ring rounded-md">
            <ArrowLeft size={14} aria-hidden="true" />
            All messages
          </Link>
          <h1 className="font-heading text-ink text-2xl font-bold">{otherName}</h1>
          {vehicle && <p className="text-accent text-sm">{vehicle}</p>}
          <p className="text-muted text-xs">Phone numbers can't be shared here — anything that looks like one is removed.</p>
        </div>

        <ChatThread bookingId={bookingId} otherUserId={otherUserId} recipientId={recipientId} />
      </div>
    </PageWrapper>
  );
}
