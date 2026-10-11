import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, SquarePen } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageBackdrop from '../components/layout/PageBackdrop';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import NewMessageModal from '../components/messages/NewMessageModal';
import { useAuthStore } from '../store/authStore';
import { USER_ROLES } from '../lib/constants';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';
import { stripPhoneNumbers } from '../lib/contactGuard';
import { conversationPath, useConversations } from '../hooks/useChat';
import nairobiSkyline from '../assets/destinations/nairobi-skyline.jpg';

/**
 * Messages (`/messages`): every conversation the signed-in person is in — with an owner about a
 * booking, or with a renter — newest first, with what was said last and how many are unread.
 * Opening one goes to the thread.
 */
export default function MessagesPage() {
  const { data: conversations = [], isLoading, isError, refetch } = useConversations();
  // Finding a person to write to uses the administrator's account list, so starting a conversation is for administrators.
  const canStartNew = useAuthStore((s) => (s.user?.roles || []).includes(USER_ROLES.ADMIN));
  const [composing, setComposing] = useState(false);
  const pages = usePagination(conversations, 15);

  return (
    <PageBackdrop image={nairobiSkyline}>
    <PageWrapper className="max-w-3xl">
      <PageTitle title="Messages" />
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-brand-white text-2xl sm:text-3xl font-bold">Messages</h1>
            <p className="text-brand-grey text-sm mt-1">
              {canStartNew
                ? "Write to anyone, or pick up a conversation. For everyone's safety, phone numbers can't be shared here."
                : "Talk to the owner or renter about a booking. For everyone's safety, phone numbers can't be shared here."}
            </p>
          </div>
          {canStartNew && (
            <Button onClick={() => setComposing(true)}>
              <SquarePen size={15} aria-hidden="true" />
              New message
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" label="Loading conversations" />
          </div>
        ) : isError ? (
          <ErrorBanner message="We couldn't load your messages just now." onRetry={refetch} />
        ) : conversations.length === 0 ? (
          <Card>
            <EmptyState
              icon={MessageSquare}
              title="No conversations yet"
              description={canStartNew ? 'Choose New message to write to someone.' : 'Open one of your bookings and choose Message to start a conversation.'}
            />
          </Card>
        ) : (
          <>
          <ul aria-label="Conversations" className="flex flex-col gap-3">
            {pages.pageItems.map((c) => {
              const unread = Number(c.unreadCount || 0);
              const name = c.otherUserName || c.otherUserEmail || 'Conversation';
              return (
                <li key={`${c.bookingId || ''}:${c.otherUserId || ''}`}>
                  <Link
                    to={conversationPath(c)}
                    className={`flex items-start gap-4 rounded-2xl border p-4 transition-colors focus-ring ${
                      unread > 0 ? 'border-brand-gold/40 bg-brand-gold/10 hover:bg-brand-gold/15' : 'border-white/10 bg-white/[0.03] hover:bg-white/5'
                    }`}
                  >
                    <span className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center shrink-0">
                      <MessageSquare size={18} className="text-brand-gold" aria-hidden="true" />
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={`text-sm truncate ${unread > 0 ? 'font-bold' : 'font-medium'} text-brand-white`}>{name}</span>
                        {c.lastMessageTime && (
                          <time dateTime={c.lastMessageTime} className="text-[11px] text-brand-grey shrink-0">
                            {formatDistanceToNow(new Date(c.lastMessageTime), { addSuffix: true })}
                          </time>
                        )}
                      </span>
                      {c.vehicleModel && <span className="text-xs text-brand-gold">{c.vehicleModel}</span>}
                      {c.lastMessage && <span className="text-xs text-brand-grey truncate">{stripPhoneNumbers(c.lastMessage).text}</span>}
                    </span>
                    {unread > 0 && (
                      <span
                        aria-label={`${unread} unread`}
                        className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-brand-gold text-brand-dark text-xs font-bold flex items-center justify-center shrink-0"
                      >
                        {unread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} noun="conversations" />
          </>
        )}
      </div>

      {canStartNew && <NewMessageModal isOpen={composing} onClose={() => setComposing(false)} />}
    </PageWrapper>
    </PageBackdrop>
  );
}
