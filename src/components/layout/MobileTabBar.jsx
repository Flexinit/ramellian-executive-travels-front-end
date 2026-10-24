import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Home, Mail, Search, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import { useUnreadMessageCount } from '../../hooks/useChat';

const TABS = [
  { label: 'Go to Home', to: '/', icon: Home, match: (p) => p === '/' },
  { label: 'Search vehicles', to: '/vehicles', icon: Search, match: (p) => p.startsWith('/vehicles') },
  { label: 'Go to Messages', to: '/messages', icon: Mail, match: (p) => p.startsWith('/messages'), badge: 'messages' },
  { label: 'Go to Inbox', to: '/inbox', icon: Bell, match: (p) => p.startsWith('/inbox'), badge: 'notifications' },
  { label: 'Go to Profile', to: '/dashboard/profile', icon: User, match: (p) => p.startsWith('/dashboard/profile') },
];

/**
 * The design system's phone tab bar ("Bottom Navigation"): a floating Ramellian-navy pill along the bottom of the
 * screen with Home, Search, Messages, Inbox and Profile — the current one in gold, the rest dimmed. Only on
 * phones (below `md`) and only for a signed-in person; it sits alongside the left menu, never instead of it.
 * The page leaves room for it with `pb-24 md:pb-0` (RootLayout).
 */
export default function MobileTabBar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { pathname } = useLocation();
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount();
  const unreadMessages = useUnreadMessageCount();
  const counts = { messages: unreadMessages, notifications: unreadNotifications };

  if (!isAuthenticated) return null;

  return (
    <nav
      aria-label="Quick links"
      className="md:hidden fixed inset-x-4 bottom-4 z-30 flex items-center justify-around rounded-full bg-brand-navy px-3 py-3 shadow-lift"
    >
      {TABS.map(({ label, to, icon: Icon, match, badge }) => {
        const active = match(pathname);
        const count = badge ? counts[badge] : 0;
        return (
          <Link
            key={to}
            to={to}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-ring ${
              active ? 'text-brand-gold' : 'text-on-accent/55 hover:text-on-accent'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.6} aria-hidden="true" />
            {count > 0 && (
              <span
                aria-label={`${count} unread`}
                className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-star text-brand-navy text-[10px] font-bold flex items-center justify-center"
              >
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
