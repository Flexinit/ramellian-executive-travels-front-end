import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, CarFront, KeyRound, LogIn } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import Button from '../ui/Button';

/**
 * Self-contained hamburger toggle + slide-in drawer for mobile navigation.
 * Reads/writes `uiStore.mobileMenuOpen` so any component can close it
 * (e.g. a link click) without prop drilling.
 *
 * @param {Array<{label: string, to: string, dropdown?: Array<{label: string, to: string}>}>} links
 */
export default function MobileMenu({ links = [] }) {
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
        className="lg:hidden p-2 rounded-lg text-ink hover:text-accent hover:bg-ink/5 transition-colors focus-ring"
      >
        {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
      </button>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeMobileMenu}
            data-testid="mobile-menu-backdrop"
          />
          <nav
            aria-label="Mobile navigation"
            className="absolute right-0 top-0 h-full w-72 max-w-[85vw] bg-surface border-l border-ink/10 overflow-y-auto px-5 py-6 flex flex-col gap-1"
          >
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
        </div>
      )}
    </>
  );
}
