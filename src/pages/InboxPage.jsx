import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CalendarCheck, MessageSquare } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import PageTitle from '../components/layout/PageTitle';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import NotificationVehiclePhoto from '../components/layout/NotificationVehiclePhoto';
import { useAuthStore } from '../store/authStore';
import { USER_ROLES } from '../lib/constants';
import Pagination from '../components/ui/Pagination';
import { usePagination } from '../hooks/usePagination';
import { notificationActionLabel, notificationLink, notificationText } from '../lib/notifications';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotificationList } from '../hooks/useNotifications';

/**
 * The Inbox (`/inbox`): the backend's notifications — an owner is told when a renter books one
 * of their vehicles, a renter when their booking moves on, and either when a message arrives. A
 * booking notification shows that booking's vehicle photo (looked up client-side — the notification
 * itself only carries a booking id, see NotificationVehiclePhoto) and a labeled action button
 * (**Review Booking** for an owner's new booking, **View Booking** otherwise, **Reply** for a
 * message) that opens what it's about and marks it read; a notification with nowhere to go just
 * gets a plain **Mark read**.
 */
export default function InboxPage() {
  const roles = useAuthStore((s) => s.user?.roles) || [];
  const who = {
    isOwner: roles.includes(USER_ROLES.OWNER) || roles.includes(USER_ROLES.MANAGER),
    isRenter: roles.includes(USER_ROLES.RENTER),
  };
  const { data: notifications = [], isLoading, isError, refetch } = useNotificationList();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const pages = usePagination(notifications, 15);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <PageWrapper className="max-w-3xl">
      <PageTitle title="Inbox" />
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-ink text-2xl sm:text-3xl font-bold">Inbox</h1>
            <p className="text-muted text-sm mt-1">
              {unreadCount > 0 ? `${unreadCount} unread` : 'You’re all caught up.'} Bookings and updates appear here as they happen.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={() => markAll.mutate()} loading={markAll.isPending}>
              Mark all as read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" label="Loading notifications" />
          </div>
        ) : isError ? (
          <ErrorBanner message="We couldn't load your notifications just now." onRetry={refetch} />
        ) : notifications.length === 0 ? (
          <Card>
            <EmptyState
              icon={Bell}
              title="No notifications yet"
              description="When a renter books your vehicle, or your own booking is updated, you'll see it here."
            />
          </Card>
        ) : (
          <>
          <ul aria-label="Notifications" className="flex flex-col gap-3">
            {pages.pageItems.map((n) => {
              const { title, message } = notificationText(n);
              const to = notificationLink(n, who);
              const actionLabel = notificationActionLabel(n, who);
              const isBooking = /BOOKING/i.test(n.referenceType || '');
              const Icon = /CHAT|MESSAGE/i.test(`${n.type} ${n.referenceType}`) ? MessageSquare : CalendarCheck;
              const classes = `flex items-start gap-4 rounded-2xl border p-4 transition-colors ${
                n.read ? 'border-ink/10 bg-black/[0.03]' : 'border-accent/40 bg-accent/10'
              }`;
              return (
                <li key={n.id} className={classes}>
                  {/* A booking notification's photo is the vehicle it's about — chat/other notifications
                      have nothing to picture, so they keep the plain icon instead. */}
                  {isBooking && n.referenceId ? (
                    <NotificationVehiclePhoto bookingId={n.referenceId} />
                  ) : (
                    <span className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-accent" aria-hidden="true" />
                    </span>
                  )}
                  <span className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <span className="flex items-start gap-2">
                      <span className={`text-sm text-ink ${n.read ? 'font-medium' : 'font-bold'}`}>
                        {title}
                        {!n.read && <span className="sr-only"> (unread)</span>}
                      </span>
                      {!n.read && <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-accent mt-1.5 shrink-0" />}
                    </span>
                    {message && <span className="text-xs text-muted break-words">{message}</span>}
                    <span className="flex items-center gap-3 mt-1 flex-wrap">
                      {n.createdAt && (
                        <time dateTime={n.createdAt} className="text-[11px] text-muted/80">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </time>
                      )}
                      {to && actionLabel && (
                        <Button size="sm" to={to} onClick={() => !n.read && markRead.mutate(n.id)}>
                          {actionLabel}
                        </Button>
                      )}
                    </span>
                  </span>
                  {!to && !n.read && (
                    <button
                      type="button"
                      onClick={() => markRead.mutate(n.id)}
                      className="text-xs text-accent hover:text-accent-hover font-semibold focus-ring rounded-md shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination page={pages.page} totalPages={pages.totalPages} onPage={pages.setPage} from={pages.from} to={pages.to} total={pages.total} noun="notifications" />
          </>
        )}
      </div>
    </PageWrapper>
  );
}
