import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import AssistantThread from '../chat/AssistantThread';
import Button from '../ui/Button';
import { useAuthStore } from '../../store/authStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';

/**
 * A floating WhatsApp-style button, bottom-right, global on every page — signed in or not, the same way a
 * real business's WhatsApp chat button is available to any visitor, not just existing customers. A more
 * discoverable, always-in-view entry point to the assistant than the top-bar icon alone, too (which only
 * ever shows once signed in, and can scroll out of view or sit behind the mobile menu toggle). Deliberately
 * styled like a recognizable WhatsApp chat launcher (solid green, the WhatsApp glyph) rather than the
 * portal's usual charcoal `Button` — this is the one widget meant to read as "chat with us", not as a
 * normal action.
 *
 * Opens the same conversation as `/assistant` in a panel right here, instead of navigating to a new page —
 * clicking the launcher again (or its own close button) closes the panel without losing anything typed in
 * it this session (`AssistantThread` itself has no history past a reload either way — see its own doc
 * comment). `POST /bot/inapp` needs a signed-in account (confirmed against the live OpenAPI spec), so a
 * signed-out visitor who opens the panel gets a prompt to log in or create an account instead of the chat
 * box — the button itself is never hidden for them. Hidden on the Assistant page itself (signed-in only, so
 * a visitor never reaches it anyway), since a second copy of the same chat there would be redundant.
 */
export default function AssistantFab() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // On a phone the launcher sat on top of whatever was in the bottom-right corner — e.g. a car card's Book
  // button. There it slides away while the person scrolls down (reading) and comes back as soon as they
  // scroll up; wider screens have room beside the content, so it always stays.
  const phone = useMediaQuery('(max-width: 639px)', false);
  const [scrollingDown, setScrollingDown] = useState(false);
  useEffect(() => {
    if (!phone) return undefined;
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 8) return;
      setScrollingDown(y > lastY && y > 80);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [phone]);
  const tucked = phone && scrollingDown && !open;

  if (pathname === '/assistant') return null;

  return (
    <>
      {open && (
        <div className={`fixed ${isAuthenticated ? 'bottom-44 md:bottom-24' : 'bottom-24'} right-5 z-40 flex w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-2xl`}>
          <div className="flex shrink-0 items-center justify-between gap-3 bg-[#25D366] px-4 py-3">
            <span className="inline-flex items-center gap-2 font-heading text-sm font-semibold text-white">
              <FaWhatsapp size={18} aria-hidden="true" />
              Chat with us
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-full p-1 text-white/90 transition hover:bg-ink/10 hover:text-white focus-ring"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-3">
            {isAuthenticated ? (
              <AssistantThread />
            ) : (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-sm text-muted">Log in or create an account to chat with our assistant.</p>
                <div className="flex gap-3">
                  <Button to="/auth/login" size="sm" onClick={() => setOpen(false)}>
                    Log In
                  </Button>
                  <Button to="/auth/register" size="sm" onClick={() => setOpen(false)}>
                    Create Account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Minimize chat' : 'Chat with the assistant'}
        aria-expanded={open}
        tabIndex={tucked ? -1 : undefined}
        className={`fixed ${isAuthenticated ? 'bottom-24 md:bottom-5' : 'bottom-5'} right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition-all duration-300 hover:scale-105 focus-ring ${
          tucked ? 'translate-y-24 opacity-0 pointer-events-none' : ''
        }`}
      >
        {open ? <X size={24} aria-hidden="true" /> : <FaWhatsapp size={28} aria-hidden="true" />}
      </button>
    </>
  );
}
