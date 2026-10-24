import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, MessageSquare, Bot } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import { useUnreadMessageCount } from '../../hooks/useChat';

export const LINK =
  'relative inline-flex items-center justify-center w-10 h-10 rounded-full text-ink hover:text-accent hover:bg-black/5 transition-colors focus-ring';

export function CountBadge({ count }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-on-accent text-[10px] font-bold flex items-center justify-center"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function BellLink() {
  const { data: count = 0 } = useUnreadNotificationCount();
  return (
    <Link to="/inbox" aria-label={count > 0 ? `Inbox, ${count} unread` : 'Inbox'} className={LINK}>
      <Bell size={20} aria-hidden="true" />
      <CountBadge count={count} />
    </Link>
  );
}

function MessagesLink() {
  const count = useUnreadMessageCount();
  return (
    <Link to="/messages" aria-label={count > 0 ? `Messages, ${count} unread` : 'Messages'} className={LINK}>
      <MessageSquare size={20} aria-hidden="true" />
      <CountBadge count={count} />
    </Link>
  );
}

/** No unread count — the assistant has no notion of unread (it's not a saved conversation, see `AssistantThread`). */
function AssistantLink() {
  return (
    <Link to="/assistant" aria-label="Assistant" className={LINK}>
      <Bot size={20} aria-hidden="true" />
    </Link>
  );
}

/**
 * The icons in the top bar for a signed-in person: the Inbox bell and the Messages link (each with the
 * number of unread items from the backend), and the Assistant link. Renders nothing when signed out. The
 * queries live in inner components so they only run for someone who is signed in.
 */
export default function NotificationBell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  if (!isAuthenticated) return null;
  return (
    <>
      <MessagesLink />
      <BellLink />
      <AssistantLink />
    </>
  );
}
