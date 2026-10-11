import React from 'react';
import { Link } from 'react-router-dom';
import { CarFront, KeyRound, LogIn } from 'lucide-react';
import Logo from '../ui/Logo';
import NavLink from './NavLink';
import UserMenu from './UserMenu';
import MobileMenu from './MobileMenu';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';
import NotificationBell from './NotificationBell';
import CartLink from './CartLink';

/**
 * The primary links. "Vehicles" and "Services" are deliberately not here: browsing is the
 * "Rent a Car" button, and the Footer still links to Services.
 */
const NAV_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

/**
 * Global site header — sticky, one line. Top left: the logo, always — for a signed-in person it fills
 * the same column as the left menu beneath it, so it sits exactly at the top of that menu. At the far right end: the About
 * and Contact links, preceded by the booking basket (once a vehicle has been added) and — for a visitor — the "Rent a Car", "List Your Car" and "Log In" buttons, in that order, or
 * once signed in the Messages and Inbox icons and the account avatar. A hamburger replaces the right
 * side on mobile (a visitor's Log In button stays in the bar beside it). Wraps the entire app (see docs/design.md §4 component tree).
 */
export default function Navbar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  return (
    <header className="sticky top-0 z-30 bg-brand-dark/95 backdrop-blur-md border-b border-white/10">
      <div
        className={`h-20 flex items-center gap-6 ${
          isAuthenticated ? 'w-full pl-4 sm:pl-6 md:pl-0 pr-4 sm:pr-6 lg:pr-8' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
        }`}
      >
        {/* Signed in: the logo fills the same 16rem-wide column as the left menu below it (same padding and divider), so it sits exactly at the top of the menu. */}
        <Link
          to="/"
          className={`focus-ring rounded-lg shrink-0 ${
            isAuthenticated ? 'md:w-64 md:h-full md:flex md:items-center md:pl-5 md:rounded-none md:border-r md:border-white/10' : ''
          }`}
        >
          <Logo size="md" />
        </Link>

        <div className="hidden lg:flex items-center gap-8 ml-auto">
          <div className="flex items-center gap-3 shrink-0">
            <CartLink />
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <UserMenu />
              </>
            ) : (
              <>
                <Button to="/vehicles">
                  <CarFront size={16} aria-hidden="true" /> Rent a Car
                </Button>
                <Button to="/auth/register?as=owner">
                  <KeyRound size={16} aria-hidden="true" /> List Your Car
                </Button>
                <Button to="/auth/login">
                  <LogIn size={16} aria-hidden="true" /> Log In
                </Button>
              </>
            )}
          </div>

          <span aria-hidden="true" className="h-6 w-px bg-white/15" />

          <nav aria-label="Primary" className="flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.label} {...link} />
            ))}
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          {/* Always in the bar on phones for a visitor — never only inside the hamburger drawer. */}
          {!isAuthenticated && (
            <Button to="/auth/login" size="sm" className="mr-1">
              <LogIn size={14} aria-hidden="true" /> Log In
            </Button>
          )}
          <CartLink />
          <NotificationBell />
          <MobileMenu links={NAV_LINKS} />
        </div>
      </div>
    </header>
  );
}
