import React from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Menu, X, CarFront, KeyRound, LogIn } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';

/**
 * Self-contained hamburger toggle + drawer (from the left) for mobile navigation. Signed in, on a phone, the
 * drawer is DashboardLayout's instead — the whole left menu plus these links — so this one only shows there from
 * `md` to `xl` (the sidebar is on screen, but the top bar's links aren't yet).
 * Reads/writes `uiStore.mobileMenuOpen` so any component can close it
 * (e.g. a link click) without prop drilling.
 *
 * The drawer is rendered into `document.body`: the header it's opened from is blurred (`backdrop-blur`), which makes
 * the header the box a `fixed` element is measured against — inside it, the drawer was squeezed into the 80px header
 * strip on a phone, showing only its first link (found 2026-10-25). Same fix as the shared Drawer.
 *
 * @param {Array<{label: string, to: string, dropdown?: Array<{label: string, to: string}>}>} links
 * @param {string} [className] — for the toggle button's place in the bar
 */
export default function MobileMenu({ links = [], className = '' }) {
  const mobileMenuOpen = useUiStore((s) => s.mobileMenuOpen);
  const toggleMobileMenu = useUiStore((s) => s.toggleMobileMenu);
  const closeMobileMenu = useUiStore((s) => s.closeMobileMenu);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  return (
    <>
      <button
        type="button"
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileMenuOpen}
        onClick={toggleMobileMenu}
        className={`xl:hidden p-2 rounded-lg text-ink hover:text-accent hover:bg-ink/5 transition-colors focus-ring ${className}`}
      >
        {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      {mobileMenuOpen && createPortal(
        <div className={`fixed inset-0 z-50 ${isAuthenticated ? 'hidden md:block xl:hidden' : 'xl:hidden'}`}>
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeMobileMenu}
            data-testid="mobile-menu-backdrop"
          />
          <nav
            aria-label="Mobile navigation"
            className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-surface border-r border-ink/10 overflow-y-auto px-5 py-6 flex flex-col gap-1"
          >
            {/* The drawer now covers the header's own toggle, so it has its own close button. */}
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeMobileMenu}
              className="self-end -mt-2 -mr-2 mb-1 p-2 rounded-lg text-ink hover:text-accent hover:bg-ink/5 transition-colors focus-ring"
            >
              <X size={22} aria-hidden="true" />
            </button>
            {links.map((item) =>
              item.dropdown && item.dropdown.length > 0 ? (
                <div key={item.label} className="flex flex-col mt-3 first:mt-0">
                  <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                    {item.label}
                  </span>
                  {item.dropdown.map((sub) => (
                    <Link
                      key={sub.to}
                      to={sub.to}
                      onClick={closeMobileMenu}
                      className="px-2 py-2 rounded-lg text-ink hover:text-accent hover:bg-ink/5 transition-colors focus-ring"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={closeMobileMenu}
                  className="px-2 py-2.5 mt-3 first:mt-0 rounded-lg text-ink font-medium hover:text-accent hover:bg-ink/5 transition-colors focus-ring"
                >
                  {item.label}
                </Link>
              )
            )}

            {!isAuthenticated && (
              <div className="flex flex-col gap-2 mt-5 pt-5 border-t border-ink/10">
                <Button to="/vehicles" onClick={closeMobileMenu}>
                  <CarFront size={16} aria-hidden="true" /> Rent a Car
                </Button>
                <Button to="/auth/register?as=owner" onClick={closeMobileMenu}>
                  <KeyRound size={16} aria-hidden="true" /> List Your Car
                </Button>
                <Button to="/auth/login" onClick={closeMobileMenu}>
                  <LogIn size={16} aria-hidden="true" /> Log In
                </Button>
              </div>
            )}
          </nav>
        </div>,
        document.body
      )}
    </>
  );
}
