import React, { useId, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import { useUnreadMessageCount } from '../../hooks/useChat';
import { useAuthStore } from '../../store/authStore';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import { primaryRoleLabel } from '../../lib/utils';

/** Runs of neighbouring items that share a `group` become one section; ungrouped items stay on their own. */
function groupItems(items) {
  const sections = [];
  items.forEach((item) => {
    const last = sections[sections.length - 1];
    if (item.group && last?.group === item.group) last.items.push(item);
    else sections.push({ group: item.group, items: [item] });
  });
  return sections;
}

function MenuLink({ item, active, badgeCounts }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      state={item.switchTo ? { switchTo: item.switchTo } : undefined}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-ring ${
        active ? 'bg-brand-gold/15 text-brand-gold' : 'text-brand-grey hover:text-brand-white hover:bg-white/5'
      }`}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      {item.label}
      {item.badge && badgeCounts[item.badge] > 0 && (
        <span
          aria-label={`${badgeCounts[item.badge]} unread`}
          className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-brand-gold text-brand-dark text-[11px] font-bold flex items-center justify-center"
        >
          {badgeCounts[item.badge] > 99 ? '99+' : badgeCounts[item.badge]}
        </span>
      )}
    </Link>
  );
}

/**
 * A folding section of the menu. From `md` up it shows a heading you can click to open or fold it (open
 * on its own while the current page is inside it); on phones the heading is hidden and the links simply
 * carry on along the strip.
 */
function MenuGroup({ label, icon: GroupIcon, containsActive, children }) {
  const panelId = useId();
  const [chosen, setChosen] = useState(null); // null = follow the current page
  const open = chosen ?? containsActive;

  return (
    <div className="contents md:block md:mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setChosen(!open)}
        className="hidden md:flex w-full items-center justify-between rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-grey hover:text-brand-white hover:bg-white/5 transition-colors focus-ring"
      >
        <span className="flex items-center gap-2">
          {GroupIcon && <GroupIcon size={15} aria-hidden="true" />}
          {label}
        </span>
        <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={panelId} className={open ? 'contents md:flex md:flex-col md:gap-1.5 md:mt-1' : 'contents md:hidden'}>
        {children}
      </div>
    </div>
  );
}

/**
 * Sidebar + routed content shell for the dashboard, owner, and admin
 * sections (docs/menu-structure.md §6). The menu is one element that changes
 * shape with the screen — a vertical sidebar from `md` up, a horizontally
 * scrolling strip along the top on phones — so the same items are reachable
 * everywhere (it used to be hidden entirely below `md`). It opens with the signed-in person's
 * profile photo and name (a link to their Profile); the logo lives in the top bar, so it isn't
 * repeated here. Rendered below the global Navbar
 * (see App.jsx's RootLayout). `flex-1` rather than `min-h-screen` so it
 * fills the remaining space under the Navbar instead of stacking a second
 * full viewport height underneath it. From `md` up the sidebar is sticky: it stays in view, under the top bar,
 * while a long page (a contract, a report) scrolls beside it.
 *
 * @param {Array<{label: string, to: string, icon?: React.ComponentType, badge?: 'messages'|'notifications', switchTo?: 'renter'|'owner', group?: string, groupIcon?: React.ComponentType}>} items
 *   — `group` (with a `groupIcon`) puts neighbouring items under one collapsible heading (used when an account holds more than one
 *   role, so the list stays short; the section holding the current page is open, the rest are folded away, and on
 *   phones the strip stays flat); `badge` shows the number of unread messages / notifications beside the item; `switchTo` makes
 *   the item change how the portal is being used (renter / owner) once it has navigated (the choice rides
 *   along in the navigation state and is applied by AccountLayout)
 * @param {string} heading
 */
export default function DashboardLayout({ items = [], heading }) {
  const { pathname } = useLocation();
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount();
  const unreadMessages = useUnreadMessageCount();
  const badgeCounts = { messages: unreadMessages, notifications: unreadNotifications };

  const user = useAuthStore((s) => s.user);
  const { photoUrl } = useProfilePhoto();
  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Account' : '';
  const roleLabel = user ? primaryRoleLabel(user.roles) : '';
  const sections = groupItems(items);

  return (
    <div className="flex flex-col md:flex-row flex-1 bg-brand-dark">
      {/* From md up the menu stays put under the top bar (h-20) while the page scrolls, scrolling on its own if taller. */}
      <aside className="flex flex-col md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-white/10 px-4 md:px-5 py-3 md:py-7 md:sticky md:top-20 md:self-start md:h-[calc(100vh-5rem)] md:overflow-y-auto">
        {user && (
          <Link
            to="/dashboard/profile"
            aria-label={`${displayName} — view your profile`}
            className="hidden md:flex items-center gap-3 rounded-2xl p-2 -mx-2 hover:bg-white/5 transition-colors focus-ring"
          >
            <Avatar name={displayName} src={photoUrl} size="lg" />
            <span className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-brand-white truncate">{displayName}</span>
              {roleLabel && <span className="text-xs text-brand-grey truncate">{roleLabel}</span>}
            </span>
          </Link>
        )}
        {heading && <p className="hidden md:block text-brand-grey text-xs uppercase tracking-widest mb-6 mt-4">{heading}</p>}

        <nav aria-label="Dashboard" className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          {sections.map((section, index) => {
            const links = section.items.map((item) => (
              <MenuLink key={item.to + item.label} item={item} active={pathname === item.to} badgeCounts={badgeCounts} />
            ));
            return section.group ? (
              <MenuGroup key={`${section.group}-${index}`} label={section.group} icon={section.items[0].groupIcon} containsActive={section.items.some((i) => i.to === pathname)}>
                {links}
              </MenuGroup>
            ) : (
              <React.Fragment key={`links-${index}`}>{links}</React.Fragment>
            );
          })}
        </nav>
      </aside>

      {/* Each page centres itself in the space beside the menu (its own PageWrapper width + mx-auto). */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
