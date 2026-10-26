import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ChevronDown, ShieldOff, X } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import { useUnreadMessageCount } from '../../hooks/useChat';
import { useAuthStore } from '../../store/authStore';
import { useProfilePhoto } from '../../hooks/useProfilePhoto';
import { primaryRoleLabel } from '../../lib/utils';
import { useUiStore } from '../../store/uiStore';
import { SITE_LINKS } from '../../lib/siteLinks';
import PickupReminder from '../booking/PickupReminder';
import EmptyState from '../ui/EmptyState';
import PageWrapper from './PageWrapper';

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
        active ? 'bg-white text-brand-navy font-semibold' : 'text-white/75 hover:text-white hover:bg-white/10'
      }`}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      {item.label}
      {item.badge && badgeCounts[item.badge] > 0 && (
        <span
          aria-label={`${badgeCounts[item.badge]} unread`}
          className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-star text-brand-navy text-[11px] font-bold flex items-center justify-center"
        >
          {badgeCounts[item.badge] > 99 ? '99+' : badgeCounts[item.badge]}
        </span>
      )}
    </Link>
  );
}

/**
 * A folding section of the menu: a heading you can click to open or fold it (open on its own while the current
 * page is inside it) — the same in the sidebar and in the phone drawer.
 */
function MenuGroup({ label, icon: GroupIcon, containsActive, children }) {
  const panelId = useId();
  const [chosen, setChosen] = useState(null); // null = follow the current page
  const open = chosen ?? containsActive;

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setChosen(!open)}
        className="flex w-full items-center justify-between rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-ring"
      >
        <span className="flex items-center gap-2">
          {GroupIcon && <GroupIcon size={15} aria-hidden="true" />}
          {label}
        </span>
        <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={panelId} className={open ? 'flex flex-col gap-1.5 mt-1' : 'hidden'}>
        {children}
      </div>
    </div>
  );
}

/**
 * Sidebar + routed content shell for the dashboard, owner, and admin
 * sections (docs/menu-structure.md §6), on Ramellian navy (white items, the current one a white pill with navy text;
 * product owner 2026-10-25). From `md` up it's a vertical sidebar; on a phone the same menu opens from the left as a
 * drawer — the top bar's ☰ button — rather than the sideways-scrolling strip it used to be (product owner,
 * 2026-10-25: "the menu on mobile should be a left menu"). The drawer also carries the site's own pages (About,
 * Terms & Conditions, Privacy Policy, Contact), which the top bar only shows from `lg` up. It opens with the signed-in person's
 * profile photo and name (a link to their Profile); the logo lives in the top bar, so it isn't
 * repeated here. Rendered below the global Navbar
 * (see App.jsx's RootLayout). `flex-1` rather than `min-h-screen` so it
 * fills the remaining space under the Navbar instead of stacking a second
 * full viewport height underneath it. From `md` up the sidebar is sticky: it stays in view, under the top bar,
 * while a long page (a contract, a report) scrolls beside it.
 *
 * @param {Array<{label: string, to: string, icon?: React.ComponentType, badge?: 'messages'|'notifications', switchTo?: 'renter'|'owner', group?: string, groupIcon?: React.ComponentType}>} items
 *   — `group` (with a `groupIcon`) puts neighbouring items under one collapsible heading (used when an account holds more than one
 *   role, so the list stays short; the section holding the current page is open, the rest are folded away); `badge` shows the number of unread messages / notifications beside the item; `switchTo` makes
 *   the item change how the portal is being used (renter / owner) once it has navigated (the choice rides
 *   along in the navigation state and is applied by AccountLayout)
 * @param {string} heading
 */
export default function DashboardLayout({ items: allItems = [], heading }) {
  const { pathname } = useLocation();
  // Pages the backend has refused this person (their session is fine — useSessionExpiry): not offered in the menu,
  // and the page itself says it isn't available instead of failing.
  const deniedPaths = useAuthStore((s) => s.deniedPaths);
  const items = allItems.filter((item) => !deniedPaths.includes(item.to));
  const denied = deniedPaths.includes(pathname);
  const { data: unreadNotifications = 0 } = useUnreadNotificationCount();
  const unreadMessages = useUnreadMessageCount();
  const badgeCounts = { messages: unreadMessages, notifications: unreadNotifications };

  const user = useAuthStore((s) => s.user);
  const { photoUrl } = useProfilePhoto();
  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Account' : '';
  const roleLabel = user ? primaryRoleLabel(user.roles) : '';
  const sections = groupItems(items);

  // The phone drawer is the top bar's menu (☰), shared through uiStore. It closes on its own when a page opens, and
  // with Escape.
  const drawerOpen = useUiStore((s) => s.mobileMenuOpen);
  const closeDrawer = useUiStore((s) => s.closeMobileMenu);
  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeDrawer();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

  const profile = user && (
    <Link
      to="/dashboard/profile"
      aria-label={`${displayName} — view your profile`}
      className="flex items-center gap-3 rounded-2xl p-2 -mx-2 hover:bg-white/10 transition-colors focus-ring"
    >
      <Avatar name={displayName} src={photoUrl} size="lg" />
      <span className="flex flex-col min-w-0">
        <span className="text-sm font-semibold text-white truncate">{displayName}</span>
        {roleLabel && <span className="text-xs text-brand-gold truncate">{roleLabel}</span>}
      </span>
    </Link>
  );
  const menu = sections.map((section, index) => {
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
  });

  return (
    <div className="flex flex-col md:flex-row flex-1 bg-canvas">
      {/* From md up the menu stays put under the top bar (h-20) while the page scrolls, scrolling on its own if taller. */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-brand-navy border-r border-brand-navy px-5 py-7 sticky top-20 self-start h-[calc(100vh-5rem)] overflow-y-auto">
        {profile}
        {heading && <p className="text-white/60 text-xs uppercase tracking-widest mb-6 mt-4">{heading}</p>}
        <nav aria-label="Dashboard" className="flex flex-col gap-1.5">
          {menu}
        </nav>
      </aside>

      {/* Phones: the same menu as a drawer from the left. Rendered into document.body — the blurred top bar would
          otherwise be the box `fixed` is measured against (see MobileMenu). */}
      {drawerOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDrawer} data-testid="menu-drawer-backdrop" />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-brand-navy overflow-y-auto px-5 pt-4 pb-8 flex flex-col shadow-2xl"
            >
              <button
                type="button"
                aria-label="Close menu"
                onClick={closeDrawer}
                className="self-end p-2 -mr-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-ring"
              >
                <X size={22} aria-hidden="true" />
              </button>
              {profile}
              {heading && <p className="text-white/60 text-xs uppercase tracking-widest mb-4 mt-4">{heading}</p>}
              {/* A tap on a link closes the drawer — also for the page already open (no route change to do it). */}
              <nav aria-label="Menu" className="flex flex-col gap-1.5" onClick={(e) => e.target.closest('a') && closeDrawer()}>
                {menu}
              </nav>
              <nav aria-label="Site" className="mt-6 pt-5 border-t border-white/15 flex flex-col gap-1">
                {SITE_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={closeDrawer}
                    className="px-4 py-2 rounded-full text-sm text-white/75 hover:text-white hover:bg-white/10 transition-colors focus-ring"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>,
          document.body
        )}

      {/* Each page centres itself in the space beside the menu (its own PageWrapper width + mx-auto). */}
      <div className="flex-1 min-w-0">
        {/* A renter's pickup that's due, pinned above every page until it's recorded. */}
        <PickupReminder />
        {denied ? (
          <PageWrapper>
            <EmptyState
              icon={ShieldOff}
              title="This page isn't available to your account"
              description="Your account doesn't have access to it. If you think it should, please contact support."
              action={{ label: 'Go to your overview', to: items[0]?.to || '/' }}
            />
          </PageWrapper>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  );
}
